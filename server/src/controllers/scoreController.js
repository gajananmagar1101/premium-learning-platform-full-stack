const Score = require('../models/Score')
const User = require('../models/User')
const Assessment = require('../models/Assessment')
const { normalizeRole, studentRoleFilter } = require('../utils/roles')

// POST /api/scores  (admin - assign score to student)
const assignScore = async (req, res) => {
  try {
    const { studentId, assessmentId, score, feedback } = req.body

    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' })
    if (score > assessment.maxScore) {
      return res.status(400).json({ success: false, message: `Score cannot exceed max score of ${assessment.maxScore}.` })
    }

    const existing = await Score.findOne({ student: studentId, assessment: assessmentId })
    let result
    if (existing) {
      existing.score = score
      existing.feedback = feedback || ''
      result = await existing.save()
    } else {
      result = await Score.create({ student: studentId, assessment: assessmentId, score, feedback })
    }

    await result.populate(['student', 'assessment'])
    res.status(201).json({ success: true, score: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/scores  (admin - all scores)
const getAllScores = async (req, res) => {
  try {
    const scores = await Score.find()
      .populate('student', 'name email grade')
      .populate('assessment', 'title subject maxScore date')
      .sort({ submittedAt: -1 })
    res.json({ success: true, scores })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/scores/analytics  (admin - dashboard analytics)
const getAnalytics = async (req, res) => {
  try {
    const [totalStudents, totalAssessments, scores] = await Promise.all([
      User.countDocuments({ role: studentRoleFilter }),
      Assessment.countDocuments(),
      Score.find().populate('assessment', 'maxScore subject'),
    ])

    const avgScore = scores.length
      ? Math.round(scores.reduce((a, s) => a + (s.score / s.assessment.maxScore) * 100, 0) / scores.length)
      : 0

    // Subject averages
    const subjectMap = {}
    scores.forEach((s) => {
      const sub = s.assessment.subject
      if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0, max: 0 }
      subjectMap[sub].total += (s.score / s.assessment.maxScore) * 100
      subjectMap[sub].count += 1
      subjectMap[sub].max = Math.max(subjectMap[sub].max, (s.score / s.assessment.maxScore) * 100)
    })

    const subjectAverages = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      classAvg: Math.round(data.total / data.count),
      topScore: Math.round(data.max),
    }))

    // Top students
    const studentScoreMap = {}
    scores.forEach((s) => {
      const id = s.student.toString()
      if (!studentScoreMap[id]) studentScoreMap[id] = { total: 0, count: 0 }
      studentScoreMap[id].total += (s.score / s.assessment.maxScore) * 100
      studentScoreMap[id].count += 1
    })

    const studentIds = Object.keys(studentScoreMap)
    const students = await User.find({ _id: { $in: studentIds } }, 'name grade')
    const leaderboard = students
      .map((s) => ({
        id: s._id,
        name: s.name,
        grade: s.grade,
        avg: Math.round(studentScoreMap[s._id.toString()].total / studentScoreMap[s._id.toString()].count),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)

    res.json({
      success: true,
      analytics: { totalStudents, totalAssessments, avgScore, subjectAverages, leaderboard },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/scores/student/:id  (admin or self)
const getStudentScores = async (req, res) => {
  try {
    const canAccess = normalizeRole(req.user.role) === 'admin' || String(req.user._id) === String(req.params.id)
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these scores.' })
    }

    const scores = await Score.find({ student: req.params.id })
      .populate('assessment', 'title subject maxScore date status')
      .sort({ submittedAt: -1 })
    res.json({ success: true, scores })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/scores/:id  (admin)
const deleteScore = async (req, res) => {
  try {
    await Score.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Score deleted.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { assignScore, getAllScores, getAnalytics, getStudentScores, deleteScore }
