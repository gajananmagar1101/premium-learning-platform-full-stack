# Student Platform Server

Express + MongoDB backend for the student platform.

## Environment

Create a `.env` from `.env.example` and set:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_ORIGINS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `TRUST_PROXY`

## Run

```bash
npm install
npm run dev
```

## Deployment notes

- Set a strong `JWT_SECRET`
- Set production `CLIENT_ORIGINS`
- Keep `ADMIN_PASSWORD` only in deployment secrets, not in source control
- Ensure MongoDB backups and network access rules are configured
- Run the API behind HTTPS in production
