# Deployment Guide

This project is set up for:

- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas

## 1. MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string.

Use this as:

- `MONGODB_URI`

## 2. Render Backend

The root `render.yaml` deploys the Spring backend from `spring-backend`.

Set these environment variables in Render:

- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Recommended values:

- `SEED_DEMO_DATA=false`
- `JWT_EXPIRATION_DAYS=7`

Backend URL example:

- `https://student-learning-platform-api.onrender.com`

## 3. Netlify Frontend

The root `netlify.toml` deploys the Vite frontend from `student-platform`.

Set this environment variable in Netlify:

- `VITE_API_URL=https://student-learning-platform-api.onrender.com/api`

## 4. GitHub

Push the repository to GitHub after confirming these files:

- `render.yaml`
- `netlify.toml`
- `DEPLOYMENT.md`

## 5. Important

- Do not commit real `.env` files
- Do not commit MongoDB secrets
- Set `FRONTEND_URL` in Render to your live Netlify domain so CORS works correctly
