require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./src/models/User')
const Assessment = require('./src/models/Assessment')
const Score = require('./src/models/Score')

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB...')

  // Clear existing data
  await Promise.all([User.deleteMany(), Assessment.deleteMany(), Score.deleteMany()])
  console.log('Cleared existing data...')

  // Create admin
  const admin = await User.create({
    name: process.env.ADMIN_NAME || 'Platform Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    isEmailVerified: true,
  })

  // Create students
  const studentData = [
    { name: 'Alice Johnson', email: 'alice@school.edu', password: 'student123', grade: '10th' },
    { name: 'Bob Martinez', email: 'bob@school.edu', password: 'student123', grade: '10th' },
    { name: 'Carol White', email: 'carol@school.edu', password: 'student123', grade: '11th' },
    { name: 'David Lee', email: 'david@school.edu', password: 'student123', grade: '11th' },
    { name: 'Emma Davis', email: 'emma@school.edu', password: 'student123', grade: '12th' },
  ]
  const students = await User.create(studentData.map((s) => ({ ...s, role: 'student', isEmailVerified: true })))

  // Create assessments
  const assessments = await Assessment.create([
    { title: 'Algebra Midterm', subject: 'Mathematics', date: '2024-07-15', maxScore: 100, status: 'completed', createdBy: admin._id },
    { title: 'Essay Writing', subject: 'English', date: '2024-07-20', maxScore: 100, status: 'completed', createdBy: admin._id },
    { title: 'Physics Lab', subject: 'Science', date: '2024-07-28', maxScore: 50, status: 'grading', createdBy: admin._id },
    { title: 'World History Quiz', subject: 'History', date: '2024-08-05', maxScore: 100, status: 'upcoming', createdBy: admin._id },
    { title: 'Calculus Final', subject: 'Mathematics', date: '2024-08-12', maxScore: 100, status: 'upcoming', createdBy: admin._id },
  ])

  // Assign scores
  const scoreData = [
    // Alice
    { student: students[0]._id, assessment: assessments[0]._id, score: 88 },
    { student: students[0]._id, assessment: assessments[1]._id, score: 92 },
    { student: students[0]._id, assessment: assessments[2]._id, score: 45 },
    // Bob
    { student: students[1]._id, assessment: assessments[0]._id, score: 74 },
    { student: students[1]._id, assessment: assessments[1]._id, score: 68 },
    { student: students[1]._id, assessment: assessments[2]._id, score: 38 },
    // Carol
    { student: students[2]._id, assessment: assessments[0]._id, score: 95 },
    { student: students[2]._id, assessment: assessments[1]._id, score: 89 },
    { student: students[2]._id, assessment: assessments[2]._id, score: 48 },
    // David
    { student: students[3]._id, assessment: assessments[0]._id, score: 61 },
    { student: students[3]._id, assessment: assessments[1]._id, score: 77 },
    // Emma
    { student: students[4]._id, assessment: assessments[0]._id, score: 82 },
    { student: students[4]._id, assessment: assessments[1]._id, score: 85 },
    { student: students[4]._id, assessment: assessments[2]._id, score: 42 },
  ]
  await Score.create(scoreData)

  console.log('\n✅ Seed complete!')
  console.log('─────────────────────────────────')
  console.log(`Admin:   ${process.env.ADMIN_EMAIL}  / ${process.env.ADMIN_PASSWORD}`)
  console.log('Student: alice@school.edu  / student123')
  console.log('Student: bob@school.edu    / student123')
  console.log('Student: carol@school.edu  / student123')
  console.log('─────────────────────────────────')
  process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })
