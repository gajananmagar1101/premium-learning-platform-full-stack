const Quiz = require('../models/Quiz')
const QuizAttempt = require('../models/QuizAttempt')
const { normalizeRole } = require('../utils/roles')

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const mapQuiz = (quizDoc) => ({
  id: String(quizDoc._id),
  title: quizDoc.title,
  subject: quizDoc.subject,
  className: quizDoc.className,
  description: quizDoc.description || '',
  deadlineAt: quizDoc.deadlineAt ? new Date(quizDoc.deadlineAt).toISOString() : undefined,
  durationMinutes: quizDoc.durationMinutes,
  status: quizDoc.status,
  questions: (quizDoc.questions || []).map((question) => ({
    id: String(question._id),
    prompt: question.prompt,
    options: question.options,
    correctOption: question.correctOption,
    points: question.points,
  })),
  totalPoints: quizDoc.totalPoints,
  createdAt: new Date(quizDoc.createdAt).toISOString(),
  updatedAt: new Date(quizDoc.updatedAt).toISOString(),
})

const mapAttempt = (attemptDoc) => ({
  id: String(attemptDoc._id),
  quizId: String(attemptDoc.quiz?._id || attemptDoc.quiz),
  studentId: String(attemptDoc.student?._id || attemptDoc.student),
  studentName: attemptDoc.studentName,
  studentEmail: attemptDoc.studentEmail,
  className: attemptDoc.className,
  answers: attemptDoc.answers || [],
  score: attemptDoc.score,
  totalPoints: attemptDoc.totalPoints,
  submittedAt: new Date(attemptDoc.submittedAt).toISOString(),
})

// GET /api/quizzes
const getQuizzes = async (req, res) => {
  try {
    const role = normalizeRole(req.user.role)
    const query = {}

    if (role !== 'admin') {
      query.status = 'published'
      const normalizedGrade = String(req.user.grade || '').trim()
      if (normalizedGrade) {
        query.className = { $regex: new RegExp(`^${escapeRegex(normalizedGrade)}$`, 'i') }
      }
    }

    const quizzes = await Quiz.find(query).sort({ createdAt: -1 })
    res.json({ success: true, quizzes: quizzes.map(mapQuiz) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/quizzes (admin)
const createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create({
      ...req.body,
      createdBy: req.user._id,
    })
    res.status(201).json({ success: true, quiz: mapQuiz(quiz) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/quizzes/:id (admin)
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' })
    }
    res.json({ success: true, quiz: mapQuiz(quiz) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/quizzes/:id (admin)
const deleteQuiz = async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id)
    await QuizAttempt.deleteMany({ quiz: req.params.id })
    res.json({ success: true, message: 'Quiz deleted.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/quizzes/attempts
const getAttempts = async (req, res) => {
  try {
    const role = normalizeRole(req.user.role)
    const query = role === 'admin' ? {} : { student: req.user._id }
    const attempts = await QuizAttempt.find(query).sort({ submittedAt: -1 })
    res.json({ success: true, attempts: attempts.map(mapAttempt) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/quizzes/:id/attempt
const submitAttempt = async (req, res) => {
  try {
    const role = normalizeRole(req.user.role)
    if (role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only learners can submit quiz attempts.' })
    }

    const quiz = await Quiz.findById(req.params.id)
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' })
    }
    if (quiz.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Quiz is not open for attempts.' })
    }
    if (quiz.deadlineAt && new Date(quiz.deadlineAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Quiz deadline has passed.' })
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : []
    const score = quiz.questions.reduce((sum, question, index) => {
      return answers[index] === question.correctOption ? sum + question.points : sum
    }, 0)

    const attempt = await QuizAttempt.findOneAndUpdate(
      { quiz: quiz._id, student: req.user._id },
      {
        quiz: quiz._id,
        student: req.user._id,
        studentName: req.user.name,
        studentEmail: req.user.email,
        className: quiz.className,
        answers,
        score,
        totalPoints: quiz.totalPoints,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )

    res.status(201).json({ success: true, attempt: mapAttempt(attempt) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAttempts,
  submitAttempt,
}
