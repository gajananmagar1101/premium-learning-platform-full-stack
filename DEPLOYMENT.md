# Deployment Guide

This project is set up for:

- Frontend: Netlify or Vercel
- Backend: Railway or Render
- Database: MongoDB Atlas

If the Netlify URL shows "Site not available" and says the site reached usage
limits, the app code is not the problem. Netlify has paused that deployed site
at the account level. Fix it by upgrading/unpausing the Netlify account, moving
the frontend to a new Netlify site/account, or deploying the frontend to Vercel.

## 1. MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string.

Use this as:

- `MONGODB_URI`

## 2. Backend

You can deploy the Spring backend from `spring-backend` to Railway or Render.

Set these environment variables in your backend platform:

- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Recommended values:

- `SEED_DEMO_DATA=false`
- `JWT_EXPIRATION_DAYS=7`
- `AI_QUIZ_ENABLED=true` if you want the "Generate AI Quiz" feature enabled
- `OPENAI_API_KEY=...` required when AI quiz generation is enabled
- `OPENAI_MODEL=gpt-4o-mini`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `AI_MAX_QUESTION_COUNT=15`

Backend URL example on Railway:

- `https://your-railway-backend.up.railway.app`

If you use Render instead, keep using your Render service URL.

## 3. Frontend

### Option A: Vercel

When importing this repository into Vercel, keep the root directory as:

- `./`

The root `vercel.json` runs the frontend build from `student-platform` and
publishes `student-platform/dist`.

Set this environment variable in Vercel:

- `VITE_API_URL=https://your-railway-backend.up.railway.app/api`

For local frontend development with the Spring backend, use:

- `VITE_API_URL=http://localhost:5003/api`

After Vercel gives you a live domain, set the backend `FRONTEND_URL` to that exact
domain so browser requests are allowed by CORS.

### Option B: Netlify

The root `netlify.toml` deploys the Vite frontend from `student-platform`.

Set this environment variable in Netlify:

- `VITE_API_URL=https://your-railway-backend.up.railway.app/api`

If you use Netlify again, make sure the account/site is not paused for usage
limits before testing the live URL.

## 4. GitHub

Push the repository to GitHub after confirming these files:

- `render.yaml`
- `netlify.toml`
- `vercel.json`
- `student-platform/vercel.json`
- `DEPLOYMENT.md`

## 5. Important

- Do not commit real `.env` files
- Do not commit MongoDB secrets
- Set `FRONTEND_URL` in Railway or Render to your live frontend domain so CORS works correctly
- For local Spring backend setup, copy [spring-backend/.env.example](/Users/gajananmagar004gmail.com/Desktop/student%20learning%20project%202/spring-backend/.env.example) to `spring-backend/.env` and add `AI_QUIZ_ENABLED=true` plus a real `OPENAI_API_KEY` if you want AI quiz generation
