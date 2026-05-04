const nodemailer = require('nodemailer')

let cachedTransporter = null

function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
  }
}

function ensureEmailConfig() {
  const config = getEmailConfig()

  if (!config.host || !config.user || !config.pass || !config.from) {
    const error = new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM.')
    error.statusCode = 500
    throw error
  }

  return config
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  const config = ensureEmailConfig()
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  return cachedTransporter
}

async function sendEmail({ to, subject, html, text }) {
  const config = ensureEmailConfig()
  const transporter = getTransporter()

  return transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  })
}

module.exports = {
  ensureEmailConfig,
  sendEmail,
}
