const Assessment = require('../models/Assessment')
const Score = require('../models/Score')

// GET /api/assessments
const getAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find().sort({ date: -1 })
    res.json({ success: true, assessments })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/assessments  (admin)
const createAssessment = async (req, res) => {
  try {
    const { title, subject, date, maxScore, status } = req.body
    const assessment = await Assessment.create({
      title, subject, date, maxScore, status,
      createdBy: req.user._id,
    })
    res.status(201).json({ success: true, assessment })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/assessments/:id  (admin)
const updateAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    })
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' })
    res.json({ success: true, assessment })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/assessments/:id  (admin)
const deleteAssessment = async (req, res) => {
  try {
    await Assessment.findByIdAndDelete(req.params.id)
    await Score.deleteMany({ assessment: req.params.id })
    res.json({ success: true, message: 'Assessment deleted.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getAssessments, createAssessment, updateAssessment, deleteAssessment }
