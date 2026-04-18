# API Endpoints Reference

## Base URL
```
http://localhost:8080/api
```

## Authentication Endpoints

### POST /auth/login
**Description:** Admin login
**Auth Required:** No
```json
Request:
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

---

## Room Endpoints

### GET /rooms
**Description:** Get all rooms
**Auth Required:** Yes
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:8080/api/rooms
```

### GET /rooms/available
**Description:** Get available rooms
**Auth Required:** No
```bash
curl http://localhost:8080/api/rooms/available
```

### GET /rooms/{id}
**Description:** Get room by ID
**Auth Required:** Yes

### POST /rooms
**Description:** Create new room
**Auth Required:** Yes
```json
{
    "roomNumber": "101",
    "type": "SINGLE",
    "pricePerNight": 2500,
    "description": "Single room with AC",
    "capacity": 1
}
```

### PUT /rooms/{id}
**Description:** Update room
**Auth Required:** Yes
```json
{
    "type": "DOUBLE",
    "pricePerNight": 4000,
    "capacity": 2
}
```

### DELETE /rooms/{id}
**Description:** Delete room
**Auth Required:** Yes

---

## Booking Endpoints

### POST /bookings/create
**Description:** Create booking
**Auth Required:** No
```json
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

### GET /bookings
**Description:** Get all bookings
**Auth Required:** Yes

### GET /bookings/{id}
**Description:** Get booking by ID
**Auth Required:** Yes

### GET /bookings/room/{roomId}
**Description:** Get bookings for room
**Auth Required:** Yes

### GET /bookings/status/confirmed
**Description:** Get confirmed bookings
**Auth Required:** Yes

### PUT /bookings/{id}/confirm
**Description:** Confirm booking (after payment)
**Auth Required:** Yes
**Params:** paymentId (query)

### PUT /bookings/{id}/checkout
**Description:** Checkout customer
**Auth Required:** Yes

---

## Payment Endpoints

### POST /payments/create-order
**Description:** Create Razorpay order
**Auth Required:** No
**Params:** 
- bookingId (query)
- amount (query)

```json
Response:
{
    "success": true,
    "data": {
        "orderId": "order_123...",
        "amount": 1250000,
        "currency": "INR",
        "receipt": "booking_1"
    }
}
```

### POST /payments/verify
**Description:** Verify payment signature
**Auth Required:** No
```json
{
    "razorpayPaymentId": "pay_123...",
    "razorpayOrderId": "order_123...",
    "razorpaySignature": "sig_123",
    "bookingId": 1
}
```

---

## Analytics Endpoints

### GET /analytics/dashboard-stats
**Description:** Get dashboard statistics
**Auth Required:** Yes
```json
Response:
{
    "success": true,
    "data": {
        "totalRevenue": 500000,
        "totalBookings": 25,
        "occupiedRooms": 4,
        "availableRooms": 2,
        "occupancyRate": 66.67
    }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
    "success": false,
    "message": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
    "success": false,
    "message": "Access denied"
}
```

### 404 Not Found
```json
{
    "success": false,
    "message": "Resource not found"
}
```

### 409 Conflict
```json
{
    "success": false,
    "message": "Room is not available for the selected dates"
}
```

### 500 Internal Server Error
```json
{
    "success": false,
    "message": "An unexpected error occurred"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## Authentication Header

All protected endpoints require:
```
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
```

---

## Rate Limiting

Not implemented in test version. For production:
- Implement request rate limiting
- Add API key authentication
- Use Redis for caching

---

## Testing with cURL

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"password123"}'

# Get Rooms
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/rooms

# Create Booking
curl -X POST http://localhost:8080/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 1,
    "customerName": "John",
    "customerEmail": "john@example.com",
    "customerPhone": "9876543210",
    "checkIn": "2024-12-20",
    "checkOut": "2024-12-25",
    "totalAmount": 10000
  }'
```

---

## Testing with Postman

1. Import endpoints from this documentation
2. Set environment variable: `base_url = http://localhost:8080/api`
3. Get token from login endpoint
4. Set Authorization header: `Bearer {{token}}`
5. Start testing!

---

**Last Updated:** December 2024
