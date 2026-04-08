export type Role = 'admin' | 'student'

export interface User {
  _id?: string
  id: string
  name: string
  email: string
  role: Role
  grade?: string
  avatar?: string
}

export interface Assessment {
  _id?: string
  id: string
  title: string
  subject: string
  date: string
  maxScore: number
  status: 'upcoming' | 'completed' | 'grading'
}

export interface StudentScore {
  _id?: string
  studentId?: string
  assessmentId?: string
  assessment?: Assessment
  score: number
  feedback?: string
  submittedAt: string
}

export interface SubjectProgress {
  subject: string
  progress: number
  score: number
}

// DB student — scores come from separate API call
export interface DBStudent {
  _id: string
  id?: string
  name: string
  email: string
  grade: string
  role: string
  createdAt: string
}

// Full student with scores (used in drawer)
export interface Student {
  _id?: string
  id: string
  name: string
  email: string
  grade: string
  scores: StudentScore[]
  subjects: SubjectProgress[]
}

export interface ChartDataPoint {
  month: string
  score: number
  average: number
}

export interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning'
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
