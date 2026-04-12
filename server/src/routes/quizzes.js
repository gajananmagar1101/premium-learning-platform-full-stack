const express = require('express')
const router = express.Router()
const { protect, adminOnly } = require('../middleware/auth')
const {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAttempts,
  submitAttempt,
} = require('../controllers/quizController')

router.get('/', protect, getQuizzes)
router.post('/', protect, adminOnly, createQuiz)
router.put('/:id', protect, adminOnly, updateQuiz)
router.delete('/:id', protect, adminOnly, deleteQuiz)

router.get('/attempts', protect, getAttempts)
router.post('/:id/attempt', protect, submitAttempt)

module.exports = router
