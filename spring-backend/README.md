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
- `AI_QUIZ_ENABLED` default `false`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` default `gpt-4o-mini`
- `OPENAI_BASE_URL` default `https://api.openai.com/v1`
- `AI_MAX_QUESTION_COUNT` default `15`

Local CORS is already configured for `localhost` and `127.0.0.1` on any Vite dev
port, so `5173`, `5174`, `5183`, and similar ports work without extra changes.

## Run Locally

1. Start MongoDB locally or provide a hosted Mongo URI.
2. Create `spring-backend/.env` from `spring-backend/.env.example`, or export the environment variables you want to override.
3. If you want AI quiz generation, enable it explicitly:

```bash
cp spring-backend/.env.example spring-backend/.env
export AI_QUIZ_ENABLED=true
export OPENAI_API_KEY=your_openai_api_key
```

The backend now auto-loads `.env` files from the current working directory and from `spring-backend/.env` during local development, so adding these values to `spring-backend/.env` is enough:

```env
AI_QUIZ_ENABLED=true
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

You can also copy those same values into your shell or deployment platform.
4. Run the backend:

```bash
mvn spring-boot:run
```

5. In the frontend, point `VITE_API_URL` to `http://localhost:5003/api`.

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
- `AI_QUIZ_ENABLED=true`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `AI_MAX_QUESTION_COUNT=15`

The health check endpoint is:

- `/api/health`
