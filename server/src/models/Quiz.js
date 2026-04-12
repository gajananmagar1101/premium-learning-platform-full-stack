const mongoose = require('mongoose')

const quizQuestionSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: [true, 'Question prompt is required'],
    trim: true,
  },
  options: {
    type: [String],
    validate: {
      validator: (value) => Array.isArray(value) && value.length === 4 && value.every((item) => String(item || '').trim().length > 0),
      message: 'Each question must have exactly 4 non-empty options.',
    },
    required: true,
  },
  correctOption: {
    type: Number,
    min: 0,
    max: 3,
    required: true,
  },
  points: {
    type: Number,
    min: 1,
    default: 1,
    required: true,
  },
}, { _id: true })

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  deadlineAt: {
    type: Date,
    default: null,
  },
  durationMinutes: {
    type: Number,
    min: 1,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft',
  },
  questions: {
    type: [quizQuestionSchema],
    validate: {
      validator: (value) => Array.isArray(value) && value.length > 0,
      message: 'At least one question is required.',
    },
    required: true,
  },
  totalPoints: {
    type: Number,
    min: 1,
    default: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true })

quizSchema.pre('validate', function (next) {
  if (Array.isArray(this.questions) && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0)
  } else {
    this.totalPoints = 0
  }
  next()
})

module.exports = mongoose.model('Quiz', quizSchema)
