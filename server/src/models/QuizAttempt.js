const mongoose = require('mongoose')

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
  },
  studentEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  className: {
    type: String,
    required: true,
    trim: true,
  },
  answers: {
    type: [Number],
    required: true,
    default: [],
  },
  score: {
    type: Number,
    min: 0,
    required: true,
  },
  totalPoints: {
    type: Number,
    min: 1,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true })

quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true })

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema)
