# Spring Backend

Spring Boot replacement backend for the student platform frontend.

## What it covers

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/assessments`
- `GET/PUT/DELETE /api/users/students`
- `GET /api/users/me/scores`
- `GET/POST/DELETE /api/scores`
- `GET /api/scores/analytics`
- `GET /api/scores/student/:id`
- `GET /api/health`

## Stack

- Spring Boot 3
- Spring Security with JWT
- Spring Data JPA
- H2 file database

## Default server

- Port: `5002`
- H2 console: `http://localhost:5002/h2-console`

## Seeded credentials

- Admin email: `admin@studentplatform.local`
- Admin password: `Admin@123`
- Sample students use password: `Student@123`

## Run

Use Maven from this directory:

```bash
mvn spring-boot:run
```

Or build a jar:

```bash
mvn clean package
java -jar target/spring-backend-0.0.1-SNAPSHOT.jar
```

## Notes

- The frontend already points to `http://localhost:5002/api`, so no frontend URL change is required.
- Response payloads intentionally mirror the existing Node API, including `_id` fields for frontend compatibility.
