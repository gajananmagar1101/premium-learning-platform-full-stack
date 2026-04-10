# Student Platform Frontend

Vite + React frontend for the student learning platform.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create an env file from `.env.example` and point `VITE_API_URL` to your backend.

3. Start the app:

```bash
npm run dev
```

## Netlify Deployment

This repo includes a root `netlify.toml` configured for the `student-platform` app.

- Base directory: `student-platform`
- Build command: `npm run build`
- Publish directory: `dist`

Set this environment variable in Netlify:

- `VITE_API_URL=https://student-learning-platform-api.onrender.com/api`

## Notes

- SPA redirects are already configured in `netlify.toml`
- Production API fallback in the code also points to the Render backend
