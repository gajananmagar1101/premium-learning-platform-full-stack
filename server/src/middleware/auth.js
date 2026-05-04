const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { normalizeRole } = require('../utils/roles')
const { sendBrowserMessagePage } = require('../utils/browserResponse')
const clientAppUrl = process.env.CLIENT_APP_URL || process.env.CLIENT_ORIGINS?.split(',')[0]?.trim() || ''

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (sendBrowserMessagePage(req, res, {
        statusCode: 401,
        eyebrow: 'Authentication Required',
        title: 'You need to sign in first',
        message: 'This page or endpoint is protected. Open the app and log in with a valid account to continue.',
        hint: 'If you opened this link directly in the browser, the backend is working, but it expects an authenticated request.',
        appUrl: clientAppUrl,
      })) {
        return
      }
      return res.status(401).json({ success: false, message: 'Not authorized. No token.' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) return res.status(401).json({ success: false, message: 'User not found.' })

    user.role = normalizeRole(user.role)
    if (
      user.accessBlockedUntil &&
      new Date(user.accessBlockedUntil).getTime() > Date.now() &&
      req.path !== '/me'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Your account access is temporarily blocked. Please wait until admin restores your access.',
      })
    }
    req.user = user
    next()
  } catch {
    if (sendBrowserMessagePage(req, res, {
      statusCode: 401,
      eyebrow: 'Session Expired',
      title: 'Invalid or expired token',
      message: 'Your session token is no longer valid. Please go back to the app and sign in again to continue.',
      hint: 'This usually happens when the token has expired, the link is old, or the request was opened directly in the browser.',
      appUrl: clientAppUrl,
    })) {
      return
    }
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

const adminOnly = (req, res, next) => {
  if (normalizeRole(req.user?.role) !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' })
  }
  next()
}

module.exports = { protect, adminOnly }
