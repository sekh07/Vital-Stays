# Vital Room Installation Guide

This project has two parts:

- Backend: Spring Boot API
- Frontend: static HTML, CSS, and JavaScript

Python is optional. It can be used only as a simple static file server for the frontend.

## 1. Prerequisites

Install these on the target machine:

- Java 17 or later
- Maven 3.8 or later
- MySQL 8.0 or later
- A browser such as Chrome, Edge, or Firefox
- Optional: VS Code Live Server
- Optional: Python or Node.js for a local frontend server

## 2. Copy The Project

Copy the full `Vital room` folder to the other machine, or clone the repository there.

## 3. Configure Environment Values

Edit `backend/.env` and set the real values for:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

If you do not plan to use Google sign-in or Razorpay on that machine, you can leave those as placeholders.

## 4. Start MySQL And Create The Database

You need the MySQL server running before the backend can connect to it.

### Option A: If MySQL is installed as a Windows service

Open PowerShell as Administrator and run:

```powershell
net start MySQL84
```

If your service has a different name, check Services in Windows and start the MySQL service from there.

### Option B: If MySQL is installed manually

Start the server from the MySQL `bin` folder. Example:

```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.4\bin"
.\mysqld.exe --console --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data"
```

If the data folder does not exist yet, create it first or use MySQL Installer to initialize the server.

### Create The Database And Tables

After MySQL is running, import the schema:

```powershell
mysql -u root -p < backend/database-schema.sql
```

That file creates the `hotel_management_db` database and all tables.

If you already created the database and only want to import the tables, you can run:

```powershell
mysql -u root -p hotel_management_db < backend/database-schema.sql
```

Use your own MySQL user if it is not `root`.

## 5. Start The Backend

From the project root:

```powershell
cd backend
& "C:\Users\ASLAM\Downloads\apache-maven-3.9.14-bin\apache-maven-3.9.14\bin\mvn.cmd" spring-boot:run
```

Backend URL:

```text
http://localhost:8080/api
```

## 6. Start The Frontend

Choose one option:

### Option A: VS Code Live Server

1. Open `frontend/index.html` in VS Code.
2. Install the Live Server extension.
3. Right-click `index.html`.
4. Choose Open with Live Server.

### Option B: Python Static Server

```powershell
cd frontend
python -m http.server 5500
```

### Option C: Node Static Server

```powershell
cd frontend
npx http-server -p 5500
```

Frontend URL:

```text
http://localhost:5500
```

## 7. Restart Instructions

If you change code:

- Stop the backend terminal with `Ctrl+C`, then run the Maven command again.
- Stop the frontend server, start it again, and refresh the browser.

## 8. First Run Checklist

- MySQL is running
- Database schema is imported
- Backend starts on port 8080
- Frontend can reach `http://localhost:8080/api`
- Google client ID is set if you want Google sign-in

## 9. Troubleshooting

- Backend not starting: check MySQL and credentials.
- Frontend not loading data: confirm backend is running.
- Google sign-in missing: confirm `GOOGLE_OAUTH_CLIENT_ID` is set.
- Payment not working: verify Razorpay keys.

## 10. Important Note

No `requirements.txt` is needed for this project because it is not a Python application.
Python is only an optional way to serve the static frontend.