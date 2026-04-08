const mongoose = require('mongoose')
const User = require('../models/User')

const isTruthy = (value) => ['true', '1', 'yes'].includes(String(value).toLowerCase())

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    await syncSingleAdmin()
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`)
    process.exit(1)
  }
}

const syncSingleAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME?.trim() || 'Admin'

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD is missing. Skipping admin sync.')
    return
  }

  await User.updateMany(
    { role: 'admin', email: { $ne: adminEmail } },
    { $set: { role: 'student' } }
  )

  let adminUser = await User.findOne({ email: adminEmail }).select('+password')

  if (!adminUser) {
    adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      grade: '',
    })
  } else {
    adminUser.name = adminName
    adminUser.role = 'admin'
    const matchesPassword = await adminUser.comparePassword(adminPassword)
    if (!matchesPassword) adminUser.password = adminPassword
  }

  await adminUser.save()
  console.log(`🔐 Single admin enforced for ${adminEmail}`)
}

const getDatabaseHealth = () => ({
  state: mongoose.connection.readyState,
  healthy: mongoose.connection.readyState === 1,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
})

module.exports = { connectDB, getDatabaseHealth, isTruthy }
