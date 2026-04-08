const express = require('express')
const router = express.Router()
const { assignScore, getAllScores, getAnalytics, getStudentScores, deleteScore } = require('../controllers/scoreController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/analytics', protect, adminOnly, getAnalytics)
router.get('/', protect, adminOnly, getAllScores)
router.post('/', protect, adminOnly, assignScore)
router.get('/student/:id', protect, getStudentScores)
router.delete('/:id', protect, adminOnly, deleteScore)

module.exports = router
