const User = require('../models/User')
const Score = require('../models/Score')

// GET /api/users/students  (admin)
const getStudents = async (req, res) => {
  try {
    console.log('[getStudents] Fetching all students from DB...')
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 })
    console.log(`[getStudents] Found ${students.length} students`)
    res.json({ success: true, students })
  } catch (err) {
    console.error('[getStudents] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/users/students/:id  (admin)
const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }
    const scores = await Score.find({ student: student._id }).populate('assessment')
    res.json({ success: true, student, scores })
  } catch (err) {
    console.error('[getStudent] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/users/students/:id  (admin)
const updateStudent = async (req, res) => {
  try {
    const { name, email, grade } = req.body
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, grade },
      { new: true, runValidators: true }
    )
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
    res.json({ success: true, student })
  } catch (err) {
    console.error('[updateStudent] Error:', err.message)
    res.status(500).json({ success: false, message: err.message })
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

module.exports = { getStudents, getStudent, updateStudent, deleteStudent, getMyScores }
