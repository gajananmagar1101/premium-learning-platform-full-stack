const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { normalizeRole } = require('../utils/roles')

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
