const mongoose = require('mongoose')

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
  },
  maxScore: {
    type: Number,
    required: [true, 'Max score is required'],
    min: 1,
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'grading'],
    default: 'upcoming',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Assessment', assessmentSchema)
