# Quick Start Guide - 5 Minutes

## Start Backend

### Step 1: Database
```bash
mysql -u root -p < backend/database-schema.sql
```

### Step 2: Configure
Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=your_password
```

### Step 3: Run
```bash
cd backend
mvn spring-boot:run
```
✅ Backend ready at: `http://localhost:8080/api`

---

## Start Frontend

### Option A: Python Server
```bash
cd frontend
python -m http.server 5500
```

Python is optional. The frontend is static, so Live Server or Node also works.

### Option B: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `frontend/index.html`
3. Click "Open with Live Server"

✅ Frontend ready at: `http://localhost:5500`

---

## Test the Application

### Customer Booking
1. Go to `http://localhost:5500`
2. Select dates and search
3. Click "Book Now"
4. Fill details and proceed to payment
5. Use test card: 4111 1111 1111 1111

### Admin Dashboard
1. Click "Admin Login"
2. Email: `admin@hotel.com`
3. Password: `password123`
4. Manage rooms and bookings

---

## Common Issues

| Issue | Solution |
|-------|----------|
| MySQL Connection Failed | Check MySQL is running: `mysql -u root -p` |
| Port 8080 in use | Change: `server.port=8081` in properties |
| API Not Found | Confirm backend is running on 8080 |
| CORS Error | Restart backend, check URL in browser |

---

## Next Steps

- [ ] Add Twilio for SMS notifications
- [ ] Implement email confirmations
- [ ] Add PDF invoice generation
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production

## Other Machine Setup

For a full step-by-step install on another computer, read [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md).
