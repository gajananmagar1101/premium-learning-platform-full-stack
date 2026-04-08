require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connectDB, getDatabaseHealth, isTruthy } = require('./config/db')

const app = express()
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

// Connect DB
connectDB()

if (isTruthy(process.env.TRUST_PROXY)) {
  app.set('trust proxy', 1)
}

// Middleware
app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) return callback(null, true)
    return callback(Object.assign(new Error(`CORS blocked for origin: ${origin}`), { statusCode: 403 }))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Root route
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: '🎓 EduTrack API is live',
    version: '1.0.0',
    endpoints: {
      health:      '/api/health',
      auth:        '/api/auth',
      users:       '/api/users',
      assessments: '/api/assessments',
      scores:      '/api/scores',
    },
  })
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/assessments', require('./routes/assessments'))
app.use('/api/scores', require('./routes/scores'))

// Health check
app.get('/api/health', (_, res) => {
  const db = getDatabaseHealth()
  res.status(db.healthy ? 200 : 503).json({
    status: db.healthy ? 'ok' : 'degraded',
    timestamp: new Date(),
    database: db,
  })
})

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }))

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack)
  const status = err.statusCode || 500
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  })
})

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
