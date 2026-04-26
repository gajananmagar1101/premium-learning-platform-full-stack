# Deployment Guide

This project is set up for:

- Frontend: Netlify or Vercel
- Backend: Render
- Database: MongoDB Atlas

If the Netlify URL shows "Site not available" and says the site reached usage
limits, the app code is not the problem. Netlify has paused that deployed site
at the account level. Fix it by upgrading/unpausing the Netlify account, moving
the frontend to a new Netlify site/account, or deploying the frontend to Vercel.

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

## 3. Frontend

### Option A: Vercel

Use the root `vercel.json` when importing this repository into Vercel.

Set this environment variable in Vercel:

- `VITE_API_URL=https://student-learning-platform-api.onrender.com/api`

After Vercel gives you a live domain, set Render's `FRONTEND_URL` to that exact
domain so browser requests are allowed by CORS.

### Option B: Netlify

The root `netlify.toml` deploys the Vite frontend from `student-platform`.

Set this environment variable in Netlify:

- `VITE_API_URL=https://student-learning-platform-api.onrender.com/api`

If you use Netlify again, make sure the account/site is not paused for usage
limits before testing the live URL.

## 4. GitHub

Push the repository to GitHub after confirming these files:

- `render.yaml`
- `netlify.toml`
- `vercel.json`
- `DEPLOYMENT.md`

## 5. Important

- Do not commit real `.env` files
- Do not commit MongoDB secrets
- Set `FRONTEND_URL` in Render to your live frontend domain so CORS works correctly
