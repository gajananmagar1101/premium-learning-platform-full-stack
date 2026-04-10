# Spring Backend

Production-style Spring Boot backend for the student platform frontend.

## Features

- JWT login and registration
- BCrypt password hashing
- Unique email validation
- Role-based authorization for `ADMIN` and `STUDENT`
- Real assignment and submission workflows
- MongoDB persistence
- Env-driven CORS and server configuration

## Main APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET/POST/PUT/DELETE /api/admin/assignments`
- `GET /api/student/assignments`
- `POST/PUT /api/student/submissions`
- `GET/PUT /api/admin/submissions`
- `GET/POST/PUT/DELETE /api/assessments`
- `GET/PUT/DELETE /api/users/students`
- `GET /api/users/me/scores`
- `GET/POST/DELETE /api/scores`
- `GET /api/scores/analytics`
- `GET /api/scores/student/:id`

## Stack

- Spring Boot 3
- Spring Security with JWT
- Spring Data MongoDB
- MongoDB

## Required Environment

The app reads these values from environment variables and falls back to local defaults:

- `PORT` default `5003`
- `MONGODB_URI` default `mongodb://localhost:27017/student_platform`
- `JWT_SECRET`
- `JWT_EXPIRATION_DAYS` default `7`
- `FRONTEND_URL` default `http://localhost:5173`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `SEED_DEMO_DATA` default `false`

## Run Locally

1. Start MongoDB locally or provide a hosted Mongo URI.
2. Export the environment variables you want to override.
3. Run the backend:

```bash
mvn spring-boot:run
```

4. In the frontend, point `VITE_API_URL` to `http://localhost:5003/api`.

## Production Notes

- Demo student/assignment data is disabled by default.
- The configured admin account is created automatically if it does not exist.
- API payloads still include `_id` for frontend compatibility.

## Render Deployment

This repo includes a root `render.yaml` that deploys this Spring backend.

Required Render environment variables:

- `MONGODB_URI` your MongoDB Atlas connection string
- `JWT_SECRET` a long random secret
- `FRONTEND_URL` your Netlify site URL
- `ADMIN_EMAIL` admin login email
- `ADMIN_PASSWORD` admin login password

Optional:

- `ADMIN_NAME`
- `JWT_EXPIRATION_DAYS`
- `SEED_DEMO_DATA=false`

The health check endpoint is:

- `/api/health`
