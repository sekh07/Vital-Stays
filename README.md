# 🏨 Hotel Management System

![Java](https://img.shields.io/badge/Java-17+-orange?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.1.5-6DB33F?logo=springboot&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-2C3E50)
![License](https://img.shields.io/badge/License-MIT-blue)

A production-style full-stack Hotel Management platform built with Spring Boot and vanilla HTML/CSS/JavaScript.

## Repository About

Hotel Management System with Spring Boot, MySQL, JWT authentication, booking workflows, payments, and responsive admin/customer dashboards.

Suggested GitHub Topics:
`hotel-management`, `spring-boot`, `java`, `mysql`, `jwt-authentication`, `rest-api`, `booking-system`, `payment-integration`, `vanilla-javascript`, `responsive-web-design`

## Release

Current stable release: **v1.0.0**

- Full release notes: [RELEASE_NOTES_v1.0.0.md](./RELEASE_NOTES_v1.0.0.md)
- Quick install on a fresh machine: [QUICKSTART.md](./QUICKSTART.md)
- Full installation walkthrough: [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)

```
hotel-management/
├── backend/              ← Spring Boot API Server
├── frontend/             ← HTML/CSS/JavaScript UI
├── README.md             ← This file
└── Documentation files
```

## 📋 Prerequisites

- **Java 17+** (for backend)
- **MySQL 8.0+** (database)
- **Maven 3.8+** (for backend build)
- **Python** or **Node.js** or **VS Code Live Server** (frontend server is optional)
- **Git** (optional)

## ⚡ Run On Another Machine In 5 Minutes

```bash
# 1) Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2) Import database schema
mysql -u root -p < backend/database-schema.sql

# 3) Start backend
cd backend
mvn spring-boot:run

# 4) Start frontend (new terminal)
cd ../frontend
python -m http.server 5500
```

Open:

- Frontend: `http://localhost:5500`
- Backend API: `http://localhost:8080/api`

For environment variables and optional integrations (Google OAuth, Razorpay), use [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md).

## 🚀 Quick Setup (Choose Your Path)

### 🔧 Backend Setup (Spring Boot)

See [backend/README.md](./backend/README.md) for detailed instructions.

**Quick Start:**
```bash
# 1. Setup Database
mysql -u root -p < backend/database-schema.sql

# 2. Update Configuration
# Edit: backend/src/main/resources/application.properties
# Set MySQL username and password

# 3. Run Backend
cd backend
mvn spring-boot:run
```

✅ Backend ready at: `http://localhost:8080/api`

---

### 🎨 Frontend Setup (HTML/CSS/JavaScript)

See [frontend/README.md](./frontend/README.md) for detailed instructions.

### 📘 Full Installation Guide

For running on another local machine, use [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md).

**Quick Start:**
```bash
# 1. Start Local Server
cd frontend

# Python 3
python -m http.server 5500

# OR Node.js
npx http-server -p 5500

# OR VS Code: Right-click index.html → "Open with Live Server"
```

✅ Frontend ready at: `http://localhost:5500`

---

## 📖 API Documentation

**Complete API documentation is in [API_REFERENCE.md](./API_REFERENCE.md)**

### Authentication Example

**Login:**
```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
    "email": "admin@hotel.com",
    "password": "password123"
}

Response:
{
    "success": true,
    "data": {
        "token": "eyJhbGc...",
        "email": "admin@hotel.com",
        "name": "Admin User",
        "expiresIn": 86400000
    }
}
```

### Rooms API

**Get All Rooms:**
```bash
GET /api/rooms
Authorization: Bearer YOUR_TOKEN
```

**Create Room:**
```bash
POST /api/rooms
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
    "roomNumber": "101",
    "type": "SINGLE",
    "pricePerNight": 2500,
    "description": "Single room",
    "capacity": 1
}
```

**Update Room:**
```bash
PUT /api/rooms/{id}
Authorization: Bearer YOUR_TOKEN
```

**Delete Room:**
```bash
DELETE /api/rooms/{id}
Authorization: Bearer YOUR_TOKEN
```

### Bookings API

**Create Booking:**
```bash
POST /api/bookings/create
Content-Type: application/json

{
    "roomId": 1,
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "9876543210",
    "checkIn": "2024-12-20",
    "checkOut": "2024-12-25",
    "totalAmount": 12500
}
```

**Get All Bookings:**
```bash
GET /api/bookings
Authorization: Bearer YOUR_TOKEN
```

**Checkout Booking:**
```bash
PUT /api/bookings/{id}/checkout
Authorization: Bearer YOUR_TOKEN
```

### Payments API

**Create Payment Order:**
```bash
POST /api/payments/create-order?bookingId=1&amount=12500
Authorization: Bearer YOUR_TOKEN
```

**Verify Payment:**
```bash
POST /api/payments/verify
Content-Type: application/json

{
    "razorpayPaymentId": "pay_...",
    "razorpayOrderId": "order_...",
    "razorpaySignature": "...",
    "bookingId": 1
}
```

### Analytics API

**Get Dashboard Stats:**
```bash
GET /api/analytics/dashboard-stats
Authorization: Bearer YOUR_TOKEN
```

---

## 🔐 Features

✅ **Authentication**: JWT-based secure login
✅ **Room Management**: Add, update, delete rooms
✅ **Booking System**: Double-booking prevention with date overlap logic
✅ **Payment Integration**: Razorpay test mode integration
✅ **Admin Dashboard**: Modern UI with analytics
✅ **Customer Booking**: Simple booking interface
✅ **Responsive Design**: Mobile-friendly UI
✅ **Error Handling**: Global exception handling
✅ **Input Validation**: Comprehensive validation

---

## 🔧 Configuration

### Razorpay Setup (Test Mode)

1. Go to https://dashboard.razorpay.com
2. Create a test account
3. Get your API keys
4. Update in `application.properties`:
   ```properties
   razorpay.key.id=rzp_test_xxxxxx
   razorpay.key.secret=your_secret_key
   ```

**Test Payment Details:**
- Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

---

## 📁 Project Structure

```
hotel-management/
├── 📁 backend/                    ← Spring Boot Application
│   ├── pom.xml
│   ├── database-schema.sql
│   ├── .env.example
│   ├── README.md
│   └── src/main/
│       ├── java/com/hotel/management/
│       │   ├── HotelManagementApplication.java
│       │   ├── entity/          (Admin, Room, Booking, Payment)
│       │   ├── repository/      (JPA Repositories)
│       │   ├── service/         (Business Logic)
│       │   ├── controller/      (REST APIs)
│       │   ├── dto/             (Data Transfer Objects)
│       │   ├── security/        (JWT & Auth)
│       │   └── exception/       (Error Handling)
│       └── resources/
│           └── application.properties
│
├── 📁 frontend/                   ← Customer & Admin UI
│   ├── index.html                (Customer Booking Page)
│   ├── admin.html                (Admin Dashboard)
│   ├── README.md
│   ├── css/
│   │   ├── style.css             (Global Styles)
│   │   ├── customer.css          (Booking Page)
│   │   └── admin.css             (Dashboard)
│   ├── js/
│   │   ├── api.js                (API Utilities)
│   │   ├── customer.js           (Booking Logic)
│   │   └── admin.js              (Dashboard Logic)
│   └── img/                       (Static Images)
│
├── 📄 README.md                   ← Main Documentation
├── 📄 QUICKSTART.md               ← 5-Minute Setup
├── 📄 API_REFERENCE.md            ← Complete API Docs
├── 📄 ARCHITECTURE.md             ← Technical Details
├── 📄 FEATURES.md                 ← Feature List
└── 📄 .gitignore
```

---

## 🧪 Testing

### Test Booking Flow

1. Open `http://localhost:5500`
2. Select dates and search rooms
3. Click "Book Now"
4. Fill customer details
5. Click "Proceed to Payment"
6. Use test card details
7. Complete payment
8. Get confirmation

### Test Admin Features

1. Open `http://localhost:5500`
2. Click "Admin Login"
3. Use: `admin@hotel.com` / `password123`
4. Add/edit/delete rooms
5. View bookings and analytics
6. Checkout customers

---

## 🐛 Troubleshooting

### Backend Issues

**1. Database Connection Error**
```
Error: Connection refused
Solution: Ensure MySQL is running and credentials are correct
```

**2. Port Already in Use**
```
Change port in application.properties:
server.port=8081
```

**3. JWT Invalid Secret**
```
Error: JWT secret must be 32+ characters
Solution: Update jwt.secret in application.properties
```

### Frontend Issues

**1. CORS Error**
```
Solution: Backend CORS configuration is already set for localhost
Ensure backend is running on port 8080
```

**2. API Not Responding**
```
Check: 
- Backend is running
- API_BASE_URL in js/api.js is correct
- Network tab in browser dev tools
```

**3. Payment Not Working**
```
Solution: Test mode keys need to be set in application.properties
Use test payment details
```

---

## 📊 Database Schema

### Admins Table
- id, email (unique), password, name, created_at

### Rooms Table
- id, room_number (unique), type, price_per_night, description, capacity, active, timestamps

### Bookings Table
- id, room_id (FK), customer details, dates, amounts, status, payment_id, timestamps

### Payments Table
- id, booking_id (FK), transaction_id, razorpay details, status, timestamps

---

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with BCrypt
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ SQL parameterized queries (JPA)
- ✅ Environment variables for secrets
- ✅ Global exception handling

---

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📝 License

This project is open source and available under MIT License.

---

## 🤝 Support

For issues and questions, please create an issue in the repository.

---

## 🚀 Deployment

### Backend (Docker)
```dockerfile
FROM openjdk:17
COPY target/hotel-management-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Frontend (Netlify/Vercel)
- Push frontend folder to GitHub
- Connect to Netlify/Vercel
- Set environment variable for API_BASE_URL

---

**Happy Coding! 🎉**
