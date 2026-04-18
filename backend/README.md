# Backend - Hotel Management System

This is the Spring Boot backend for the Hotel Management System.

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < database-schema.sql
```

For existing databases, apply incremental schema updates from `migrations/`.
Examples (if your terminal is inside `backend/`):
```bash
mysql -u root -p hotel_management_db < migrations/2026-04-18-add-booking-overlap-index.sql
mysql -u root -p hotel_management_db < migrations/2026-04-18-add-payment-and-booking-history-indexes.sql
mysql -u root -p hotel_management_db < migrations/2026-04-18-verify-performance-indexes.sql
```

PowerShell-safe alternatives:
```powershell
cmd /c "mysql -u root -p hotel_management_db < migrations\2026-04-18-add-booking-overlap-index.sql"
cmd /c "mysql -u root -p hotel_management_db < migrations\2026-04-18-add-payment-and-booking-history-indexes.sql"
cmd /c "mysql -u root -p hotel_management_db < migrations\2026-04-18-verify-performance-indexes.sql"
```

If your terminal is at project root (one level above `backend/`), use:
```powershell
cmd /c "mysql -u root -p hotel_management_db < backend\migrations\2026-04-18-add-booking-overlap-index.sql"
cmd /c "mysql -u root -p hotel_management_db < backend\migrations\2026-04-18-add-payment-and-booking-history-indexes.sql"
cmd /c "mysql -u root -p hotel_management_db < backend\migrations\2026-04-18-verify-performance-indexes.sql"
```

Run all performance migrations in one step (PowerShell):
```powershell
# From backend folder
.\migrations\run-performance-migrations.ps1

# Or from project root
.\backend\migrations\run-performance-migrations.ps1
```

Optional parameters:
```powershell
.\backend\migrations\run-performance-migrations.ps1 -DbUser root -DbName hotel_management_db -MysqlExecutable mysql
```

### 2. Configuration
Edit `src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=your_password
```

### 3. Run
```bash
mvn spring-boot:run
```

Backend runs on: `http://localhost:8080/api`

## Notes

- This backend is a Spring Boot application, so no `requirements.txt` is needed.
- If you use Python to serve the frontend, that is only a static server and not a Python app dependency list.

## Project Structure

```
backend/
├── pom.xml
├── .env.example
├── database-schema.sql
├── README.md (this file)
└── src/main/
    ├── java/com/hotel/management/
    │   ├── HotelManagementApplication.java
    │   ├── entity/
    │   ├── repository/
    │   ├── service/
    │   ├── controller/
    │   ├── dto/
    │   ├── security/
    │   └── exception/
    └── resources/
        └── application.properties
```

## API Endpoints

See `../API_REFERENCE.md` for complete API documentation.

## Technologies

- Java 17
- Spring Boot 3.1.5
- MySQL 8.0+
- Maven
- JWT
- Spring Security
- Hibernate/JPA

## Environment Variables

Copy `.env.example` to `.env` and update:
- Database credentials
- JWT secret
- Razorpay keys (if needed)
- Email configuration

## Default Admin Credentials

After running `database-schema.sql`:
- Email: `admin@hotel.com`
- Password: `password123`

## Troubleshooting

- **Port in use**: Change `server.port` in `application.properties`
- **DB Connection failed**: Ensure MySQL is running
- **JWT Error**: Verify secret is 32+ characters
