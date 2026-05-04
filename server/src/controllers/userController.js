const User = require('../models/User')
const Score = require('../models/Score')
const { normalizeEmail } = require('../utils/emailValidation')
const { normalizeRole, studentRoleFilter } = require('../utils/roles')

const serializeStudent = (student) => {
  const data = typeof student?.toObject === 'function' ? student.toObject() : { ...student }
  const blockedUntil = data.accessBlockedUntil ? new Date(data.accessBlockedUntil) : null
  const accessBlocked = Boolean(blockedUntil && blockedUntil.getTime() > Date.now())

  return {
    ...data,
    accessBlocked,
    accessBlockedUntil: accessBlocked && blockedUntil ? blockedUntil.toISOString() : null,
    accessBlockReason: accessBlocked ? data.accessBlockReason ?? null : null,
  }
}

const handleUserWriteError = (res, err, action) => {
  console.error(`[${action}] Error:`, err.message)

  if (err?.code === 11000) {
    return res.status(400).json({ success: false, message: 'Email already registered.' })
  }

  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((error) => error.message)
      .filter(Boolean)
      .join(', ')

    return res.status(400).json({ success: false, message: message || 'Invalid user data.' })
  }

  return res.status(500).json({ success: false, message: err.message })
}

// GET /api/users/students  (admin)
const getStudents = async (req, res) => {
  try {
    console.log('[getStudents] Fetching all students from DB...')
    const students = await User.find({ role: studentRoleFilter }).sort({ createdAt: -1 })
    console.log(`[getStudents] Found ${students.length} students`)
    res.json({ success: true, students: students.map(serializeStudent) })
  } catch (err) {
    console.error('[getStudents] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/users/students/:id  (admin)
const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
    if (!student || normalizeRole(student.role) !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }
    const scores = await Score.find({ student: student._id }).populate('assessment')
    res.json({ success: true, student: serializeStudent(student), scores })
  } catch (err) {
    console.error('[getStudent] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/users/students/:id  (admin)
const updateStudent = async (req, res) => {
  try {
    const existingStudent = await User.findById(req.params.id)
    if (!existingStudent || normalizeRole(existingStudent.role) !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }

    const { name, email, grade } = req.body
    const student = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email: normalizeEmail(email),
        grade: grade ?? '',
        role: normalizeRole(existingStudent.role),
      },
      { new: true, runValidators: true }
    )
    res.json({ success: true, student: serializeStudent(student) })
  } catch (err) {
    return handleUserWriteError(res, err, 'updateStudent')
  }
}

// PUT /api/users/students/:id/access (admin)
const updateStudentAccess = async (req, res) => {
  try {
    const existingStudent = await User.findById(req.params.id)
    if (!existingStudent || normalizeRole(existingStudent.role) !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }

    const blockedUntilText = typeof req.body?.blockedUntil === 'string' ? req.body.blockedUntil.trim() : ''
    const reasonText = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''

    if (!blockedUntilText) {
      existingStudent.accessBlockedUntil = null
      existingStudent.accessBlockReason = null
    } else {
      const blockedUntil = new Date(blockedUntilText)
      if (Number.isNaN(blockedUntil.getTime())) {
        return res.status(400).json({ success: false, message: 'Enter a valid block-until date and time.' })
      }
      if (blockedUntil.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'Block-until time must be in the future.' })
      }

      existingStudent.accessBlockedUntil = blockedUntil
      existingStudent.accessBlockReason = reasonText || 'Access paused temporarily by admin.'
    }

    await existingStudent.save()
    return res.json({ success: true, student: serializeStudent(existingStudent) })
  } catch (err) {
    return handleUserWriteError(res, err, 'updateStudentAccess')
  }
}

// PUT /api/users/me  (self)
const updateMe = async (req, res) => {
  try {
    const normalizedRole = normalizeRole(req.user.role)
    const updates = {
      name: req.body.name,
      email: normalizeEmail(req.user.email),
      role: normalizedRole,
    }

    if (normalizedRole === 'student') {
      updates.grade = req.body.grade ?? ''
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    res.json({ success: true, user: serializeStudent(user) })
  } catch (err) {
    return handleUserWriteError(res, err, 'updateMe')
  }
}

// DELETE /api/users/students/:id  (admin)
const deleteStudent = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    await Score.deleteMany({ student: req.params.id })
    console.log(`[deleteStudent] Deleted student ${req.params.id}`)
    res.json({ success: true, message: 'Student deleted.' })
  } catch (err) {
    console.error('[deleteStudent] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/users/me/scores  (student)
const getMyScores = async (req, res) => {
  try {
    const scores = await Score.find({ student: req.user._id }).populate('assessment')
    res.json({ success: true, scores })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getStudents, getStudent, updateStudent, updateStudentAccess, updateMe, deleteStudent, getMyScores }
