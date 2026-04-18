# Architecture & Technical Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
│  ┌──────────────────┐           ┌──────────────────┐       │
│  │  Customer Page   │           │  Admin Dashboard │       │
│  │  (HTML/CSS/JS)   │           │  (HTML/CSS/JS)   │       │
│  └────────┬─────────┘           └────────┬─────────┘       │
│           │                              │                   │
│           └──────────────────┬───────────┘                   │
│                              │                               │
│                      (REST API Calls)                        │
└──────────────────────────────┼─────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────┐
│                     Backend (Spring Boot)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Controllers (REST APIs)                 │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ AuthController | RoomController | ...       │   │   │
│  │  └────────────┬──────────────────┬─────────────┘   │   │
│  └─────────────────┼────────────────┼──────────────────┘   │
│                    │                │                       │
│  ┌─────────────────▼────────────────▼──────────────────┐   │
│  │          Services & Business Logic                 │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │ AuthService | RoomService | BookingService │   │   │
│  │  │ PaymentService | AnalyticsService         │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  └─────────────────┬────────────────┬──────────────────┘   │
│                    │                │                       │
│  ┌─────────────────▼────────────────▼──────────────────┐   │
│  │          Repositories (Data Access)                │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │ AdminRepository | RoomRepository | ...     │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  └─────────────────┬─────────────────────────────────┘    │
│                    │                                       │
└────────────────────┼───────────────────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │   MySQL Database       │
         │   (hotel_management_db)│
         └────────────────────────┘
```

## Layered Architecture

### Controller Layer
- `AuthController`: Authentication endpoints
- `RoomController`: Room management APIs
- `BookingController`: Booking operations
- `PaymentController`: Payment processing
- `AnalyticsController`: Analytics data

### Service Layer
- `AuthService`: Login, JWT token generation
- `RoomService`: Room CRUD operations
- `BookingService`: Booking logic, date validation, double-booking prevention
- `PaymentService`: Payment verification with Razorpay
- `AnalyticsService`: Dashboard statistics

### Repository Layer
- JPA repositories for database operations
- Spring Data provides standard CRUD + custom queries

### Security Layer
- `JwtTokenProvider`: Token generation and validation
- `JwtAuthenticationFilter`: Request filtering
- `SecurityConfig`: Global security configuration with CORS

### Exception Handling
- `GlobalExceptionHandler`: Centralized exception handling
- Custom exceptions: `ResourceNotFoundException`, `BookingConflictException`

---

## Database Schema

### Entities & Relationships

```
┌────────────────┐
│    Admins      │
├────────────────┤
│ id (PK)        │
│ email          │
│ password       │
│ name           │
│ created_at     │
└────────────────┘

┌────────────────┐
│    Rooms       │
├────────────────┤
│ id (PK)        │
│ room_number    │
│ type           │
│ price_per_night│
│ capacity       │
│ active         │
│ created_at     │
└────────┬───────┘
         │
         │ 1:N
         │
┌────────▼────────────┐
│   Bookings          │ 1:1  ┌───────────────┐
├─────────────────────┤─────▶│  Payments     │
│ id (PK)             │      ├───────────────┤
│ room_id (FK)        │      │ id (PK)       │
│ customer_name       │      │ booking_id(FK)│
│ customer_email      │      │ payment_status│
│ customer_phone      │      │ razorpay_*    │
│ check_in            │      │ created_at    │
│ check_out           │      └───────────────┘
│ total_amount        │
│ status              │
│ payment_id          │
│ created_at          │
└─────────────────────┘
```

---

## Key Features Implementation

### 1. Double-Booking Prevention
```java
// Query: Find overlapping bookings
List<Booking> conflicts = bookingRepository.findConflictingBookings(
    roomId,
    newBooking.checkIn,
    newBooking.checkOut
);

// Logic: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
if (!conflicts.isEmpty()) {
    throw new BookingConflictException("Room not available");
}
```

### 2. JWT Authentication Flow
```
Client Login
    ↓
AuthController.login()
    ↓
AuthService validates credentials
    ↓
JwtTokenProvider generates token
    ↓
Token sent to client
    ↓
Client includes token in Authorization header
    ↓
JwtAuthenticationFilter validates token
    ↓
Access granted to protected resources
```

### 3. Payment Processing
```
1. Create Booking (PENDING)
2. Create Payment Order (via Razorpay API)
3. User completes payment on Razorpay
4. Razorpay returns payment details
5. Verify signature using HMAC-SHA256
6. Update Payment status to SUCCESS
7. Update Booking status to CONFIRMED
```

---

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.1.5
- **Language**: Java 17
- **Build Tool**: Maven
- **Database**: MySQL 8.0+
- **ORM**: Hibernate/JPA
- **Authentication**: JWT (io.jsonwebtoken)
- **Security**: Spring Security with BCrypt
- **APIs**: Spring Data JPA
- **JSON Processing**: Jackson Databind

### Frontend
- **Language**: Vanilla JavaScript (ES6+)
- **Markup**: HTML5
- **Styling**: CSS3 with custom properties
- **HTTP Client**: Fetch API
- **Payment**: Razorpay Checkout

---

## Scalability Considerations

### Current State (Development)
- Single MySQL instance
- No caching layer
- Basic authentication

### Future Improvements
1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Implement query optimization
   - Consider denormalization for analytics

2. **Caching**
   - Redis for session caching
   - Cache frequently accessed data (rooms, analytics)

3. **Horizontal Scaling**
   - Load balancer (NGINX)
   - Multiple backend instances
   - Separate database replica for read operations

4. **Performance**
   - Database connection pooling
   - API pagination
   - Query optimization
   - Async processing for notifications

5. **Security**
   - Rate limiting
   - API key authentication
   - OAuth2 integration
   - Two-factor authentication

---

## Deployment Architecture

### Production Deployment
```
CDN (Static Assets)
    ↓
Load Balancer (NGINX/HAProxy)
    ├─ Backend Instance 1 (Docker)
    ├─ Backend Instance 2 (Docker)
    └─ Backend Instance 3 (Docker)
    ↓
Database (MySQL RDS/Managed)
    ├─ Primary Instance
    └─ Replica Instance
```

### CI/CD Pipeline
```
Code Push to GitHub
    ↓
GitHub Actions/GitLab CI
    ├─ Run Tests
    ├─ Build Docker Image
    ├─ Push to Registry
    ↓
Deploy to Kubernetes/Docker Swarm
    ↓
Run in Production
```

---

## Security Features

1. **Input Validation**
   - All inputs validated at controller and service level
   - Comprehensive error messages without exposing internals

2. **Authentication**
   - JWT-based authentication
   - Token expiration (24 hours by default)
   - Secure password hashing (BCrypt)

3. **Authorization**
   - Protected endpoints require valid JWT
   - Role-based access control (extensible)

4. **Data Protection**
   - SQL parameterized queries (JPA)
   - CORS configuration
   - No sensitive data in logs

5. **HTTPS Ready**
   - Application can run behind HTTPS proxy
   - Environment-based configuration

---

## Performance Metrics

### Target Performance
- API Response Time: < 200ms
- Database Query Time: < 50ms
- Page Load Time: < 2s
- Concurrent Users: 1000+

### Monitoring Points
- Request/Response times
- Database connection pool
- Memory usage
- Error rates
- Authentication success/failure rates

---

## Future Features Roadmap

- [ ] Role-based access control (ADMIN, STAFF, CUSTOMER)
- [ ] Multi-hotel support
- [ ] SMS/WhatsApp notifications (Twilio)
- [ ] Email confirmations with PDF invoices
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced analytics and reporting
- [ ] Automated backups
- [ ] Real-time availability updates
- [ ] Loyalty program
- [ ] Dynamic pricing

---

**Last Updated:** December 2024
