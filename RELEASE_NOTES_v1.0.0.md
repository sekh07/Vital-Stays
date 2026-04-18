# Release Notes - v1.0.0

Release Date: 2026-04-18

## Overview

v1.0.0 is the first stable release of the Hotel Management System. This release delivers a production-style full-stack booking platform with Spring Boot APIs, MySQL persistence, JWT security, and responsive admin/customer frontend interfaces.

## Added

- Spring Boot backend with layered architecture:
  - controllers
  - services
  - repositories
  - DTOs
  - exception handling
- JWT-based authentication and secure API access
- Room lifecycle management APIs (create, update, delete, list)
- Booking flow with date overlap handling to prevent double-booking
- Payment order and verification flow for Razorpay test mode
- Dashboard analytics endpoints for operational summaries
- Customer and admin frontend pages using vanilla HTML, CSS, and JavaScript
- Project documentation:
  - API reference
  - architecture notes
  - installation and quickstart guides

## Changed

- Documentation improved for first-time setup on a new machine
- Root README expanded with deployment-friendly setup flow
- .gitignore aligned for Java build output, env files, and IDE artifacts

## Security Notes

- Do not commit real secrets in any env or properties files
- Use backend/.env.example as a template for local configuration
- Keep JWT secret and payment keys outside Git history

## Tested

- Backend test suite executed via Maven test lifecycle
- API endpoints manually validated for auth, room, booking, and payment flows
- Frontend flows validated in browser for customer and admin journeys

## Upgrade/Install Notes

1. Import schema using backend/database-schema.sql
2. Configure local environment values
3. Run backend with Maven
4. Serve frontend from any static server

See:
- INSTALLATION_GUIDE.md
- QUICKSTART.md
- API_REFERENCE.md

## Known Limitations

- Payment and OAuth features require valid third-party credentials
- Production deployment configuration is environment-dependent

## Next Roadmap Candidates

- CI/CD pipeline
- Dockerized local development stack
- Enhanced automated integration testing
- Booking confirmation via SMS/email
