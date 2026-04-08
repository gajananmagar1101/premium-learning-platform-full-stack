import type { Assessment, Student, ChartDataPoint } from '@/types'

export const mockAssessments: Assessment[] = [
  { id: 'a1', title: 'Algebra Midterm', subject: 'Mathematics', date: '2024-07-15', maxScore: 100, status: 'completed' },
  { id: 'a2', title: 'Essay Writing', subject: 'English', date: '2024-07-20', maxScore: 100, status: 'completed' },
  { id: 'a3', title: 'Physics Lab', subject: 'Science', date: '2024-07-28', maxScore: 50, status: 'grading' },
  { id: 'a4', title: 'World History Quiz', subject: 'History', date: '2024-08-05', maxScore: 100, status: 'upcoming' },
  { id: 'a5', title: 'Calculus Final', subject: 'Mathematics', date: '2024-08-12', maxScore: 100, status: 'upcoming' },
  { id: 'a6', title: 'Literature Review', subject: 'English', date: '2024-08-18', maxScore: 100, status: 'upcoming' },
]

export const mockStudents: Student[] = [
  {
    id: 's1', name: 'Alice Johnson', email: 'alice@school.edu', grade: '10th',
    scores: [
      { studentId: 's1', assessmentId: 'a1', score: 88, submittedAt: '2024-07-15' },
      { studentId: 's1', assessmentId: 'a2', score: 92, submittedAt: '2024-07-20' },
      { studentId: 's1', assessmentId: 'a3', score: 45, submittedAt: '2024-07-28' },
    ],
    subjects: [
      { subject: 'Mathematics', progress: 88, score: 88 },
      { subject: 'English', progress: 92, score: 92 },
      { subject: 'Science', progress: 75, score: 75 },
      { subject: 'History', progress: 80, score: 80 },
    ],
  },
  {
    id: 's2', name: 'Bob Martinez', email: 'bob@school.edu', grade: '10th',
    scores: [
      { studentId: 's2', assessmentId: 'a1', score: 74, submittedAt: '2024-07-15' },
      { studentId: 's2', assessmentId: 'a2', score: 68, submittedAt: '2024-07-20' },
      { studentId: 's2', assessmentId: 'a3', score: 38, submittedAt: '2024-07-28' },
    ],
    subjects: [
      { subject: 'Mathematics', progress: 74, score: 74 },
      { subject: 'English', progress: 68, score: 68 },
      { subject: 'Science', progress: 60, score: 60 },
      { subject: 'History', progress: 72, score: 72 },
    ],
  },
  {
    id: 's3', name: 'Carol White', email: 'carol@school.edu', grade: '11th',
    scores: [
      { studentId: 's3', assessmentId: 'a1', score: 95, submittedAt: '2024-07-15' },
      { studentId: 's3', assessmentId: 'a2', score: 89, submittedAt: '2024-07-20' },
      { studentId: 's3', assessmentId: 'a3', score: 48, submittedAt: '2024-07-28' },
    ],
    subjects: [
      { subject: 'Mathematics', progress: 95, score: 95 },
      { subject: 'English', progress: 89, score: 89 },
      { subject: 'Science', progress: 90, score: 90 },
      { subject: 'History', progress: 85, score: 85 },
    ],
  },
  {
    id: 's4', name: 'David Lee', email: 'david@school.edu', grade: '11th',
    scores: [
      { studentId: 's4', assessmentId: 'a1', score: 61, submittedAt: '2024-07-15' },
      { studentId: 's4', assessmentId: 'a2', score: 77, submittedAt: '2024-07-20' },
      { studentId: 's4', assessmentId: 'a3', score: 30, submittedAt: '2024-07-28' },
    ],
    subjects: [
      { subject: 'Mathematics', progress: 61, score: 61 },
      { subject: 'English', progress: 77, score: 77 },
      { subject: 'Science', progress: 55, score: 55 },
      { subject: 'History', progress: 65, score: 65 },
    ],
  },
  {
    id: 's5', name: 'Emma Davis', email: 'emma@school.edu', grade: '12th',
    scores: [
      { studentId: 's5', assessmentId: 'a1', score: 82, submittedAt: '2024-07-15' },
      { studentId: 's5', assessmentId: 'a2', score: 85, submittedAt: '2024-07-20' },
      { studentId: 's5', assessmentId: 'a3', score: 42, submittedAt: '2024-07-28' },
    ],
    subjects: [
      { subject: 'Mathematics', progress: 82, score: 82 },
      { subject: 'English', progress: 85, score: 85 },
      { subject: 'Science', progress: 78, score: 78 },
      { subject: 'History', progress: 88, score: 88 },
    ],
  },
]

export const performanceData: ChartDataPoint[] = [
  { month: 'Feb', score: 72, average: 68 },
  { month: 'Mar', score: 75, average: 70 },
  { month: 'Apr', score: 78, average: 72 },
  { month: 'May', score: 74, average: 71 },
  { month: 'Jun', score: 82, average: 74 },
  { month: 'Jul', score: 88, average: 76 },
]

export const assessmentComparisonData = [
  { subject: 'Math', classAvg: 76, topScore: 95 },
  { subject: 'English', classAvg: 82, topScore: 92 },
  { subject: 'Science', classAvg: 71, topScore: 90 },
  { subject: 'History', classAvg: 78, topScore: 88 },
]
