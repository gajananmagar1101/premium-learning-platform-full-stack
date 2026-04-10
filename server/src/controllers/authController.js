const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { getEmailValidationMessage, isRealisticEmail, normalizeEmail } = require('../utils/emailValidation')
const { normalizeRole } = require('../utils/roles')

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim()

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, grade } = req.body

    console.log(`[register] Attempt: email=${email}, role=${role || 'student'}`)

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' })
    }

    const normalizedEmail = normalizeEmail(email)

    if (!isRealisticEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: getEmailValidationMessage() })
    }

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      console.log(`[register] Email already exists: ${email}`)
      return res.status(400).json({ success: false, message: 'Email already registered.' })
    }

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'This email is reserved for the system admin.' })
    }

    // Public registration can only create student accounts.
    const assignedRole = 'student'

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      grade: grade || '',
    })

    console.log(`[register] ✅ Created user: id=${user._id}, name=${user.name}, role=${user.role}`)

    const token = signToken(user._id)
    res.status(201).json({ success: true, token, user })
  } catch (err) {
    console.error('[register] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    console.log(`[login] Attempt: email=${email}`)

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      console.log(`[login] ❌ Invalid credentials for: ${email}`)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    user.role = normalizeRole(user.role)

    if (user.role === 'admin' && user.email !== ADMIN_EMAIL) {
      console.log(`[login] ❌ Blocked non-authorized admin login for: ${email}`)
      return res.status(403).json({ success: false, message: 'Only the configured admin account can log in as admin.' })
    }

    console.log(`[login] ✅ Login success: id=${user._id}, role=${user.role}`)
    const token = signToken(user._id)
    res.json({ success: true, token, user })
  } catch (err) {
    console.error('[login] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user })
}

module.exports = { register, login, getMe }
