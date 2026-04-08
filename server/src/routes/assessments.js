const express = require('express')
const router = express.Router()
const { getAssessments, createAssessment, updateAssessment, deleteAssessment } = require('../controllers/assessmentController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/', protect, getAssessments)
router.post('/', protect, adminOnly, createAssessment)
router.put('/:id', protect, adminOnly, updateAssessment)
router.delete('/:id', protect, adminOnly, deleteAssessment)

module.exports = router
