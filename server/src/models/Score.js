const mongoose = require('mongoose')

const scoreSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: 0,
  },
  feedback: {
    type: String,
    default: '',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
})

// One score per student per assessment
scoreSchema.index({ student: 1, assessment: 1 }, { unique: true })

module.exports = mongoose.model('Score', scoreSchema)
