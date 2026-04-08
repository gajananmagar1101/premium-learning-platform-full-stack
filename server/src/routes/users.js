const express = require('express')
const router = express.Router()
const { getStudents, getStudent, updateStudent, deleteStudent, getMyScores } = require('../controllers/userController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/students', protect, adminOnly, getStudents)
router.get('/students/:id', protect, adminOnly, getStudent)
router.put('/students/:id', protect, adminOnly, updateStudent)
router.delete('/students/:id', protect, adminOnly, deleteStudent)
router.get('/me/scores', protect, getMyScores)

module.exports = router
