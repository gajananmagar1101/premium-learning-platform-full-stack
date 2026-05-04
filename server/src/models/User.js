const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { getEmailValidationMessage, isRealisticEmail } = require('../utils/emailValidation')
const { normalizeRole } = require('../utils/roles')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: isRealisticEmail,
      message: getEmailValidationMessage(),
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student',
    set: normalizeRole,
  },
  grade: {
    type: String,
    default: '',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  emailVerificationSentAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  accessBlockedUntil: {
    type: Date,
    default: null,
  },
  accessBlockReason: {
    type: String,
    default: null,
    trim: true,
  },
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

module.exports = mongoose.model('User', userSchema)
