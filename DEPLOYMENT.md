# Deployment Guide

This repository currently runs in production with:

- Frontend: `student-platform` (React + Vite)
- Backend: `server` (Node.js + Express)
- Database: MongoDB Atlas

## 1. Push this repo to GitHub

Use your repository:

- `https://github.com/gajananm04/student-learning-platform-full-stack.git`

## 2. Deploy the backend on Render

Create a new Web Service and point it to this repo with:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables:

```env
PORT=5002
MONGO_URI=your-atlas-uri
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
CLIENT_ORIGINS=https://your-frontend-domain
ADMIN_EMAIL=gajananmagar.11.01@gmail.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_NAME=Gajanan Admin
TRUST_PROXY=true
```

## 3. Prepare MongoDB Atlas

In Atlas:

1. Make sure the cluster is active
2. Create a database user
3. Add an IP access rule
4. For initial deployment, you can use `0.0.0.0/0`
5. Use a URI that includes your database name, for example:

```env
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/student_platform?retryWrites=true&w=majority
```

## 4. Deploy the frontend on Vercel

Create a new Vercel project from this repo with:

- Root Directory: `student-platform`
- Build Command: `npm run build`
- Output Directory: `dist`

Set this environment variable:

```env
VITE_API_URL=https://your-backend-domain/api
```

`student-platform/vercel.json` is already included so React Router routes work on refresh.

## 5. Update backend CORS

Once the frontend domain is live, set:

```env
CLIENT_ORIGINS=https://your-project.vercel.app
```

If you use more than one domain:

```env
CLIENT_ORIGINS=https://your-project.vercel.app,https://www.yourdomain.com
```

## 6. Verify production

Check:

1. Frontend loads
2. Student registration works
3. Admin login works
4. Assessments load
5. Grade assignment works
6. Student dashboard shows grades
