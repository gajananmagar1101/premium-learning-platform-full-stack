import api from './api'

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data: { name: string; email: string; password: string; role: string; grade?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
}

// ── Assessments ───────────────────────────────────────
export const assessmentAPI = {
  getAll: () => api.get('/assessments'),
  create: (data: object) => api.post('/assessments', data),
  update: (id: string, data: object) => api.put(`/assessments/${id}`, data),
  delete: (id: string) => api.delete(`/assessments/${id}`),
}

// ── Students ──────────────────────────────────────────
export const studentAPI = {
  getAll: () => api.get('/users/students'),
  getOne: (id: string) => api.get(`/users/students/${id}`),
  update: (id: string, data: object) => api.put(`/users/students/${id}`, data),
  updateMe: (data: { name: string; email: string; grade?: string }) => api.put('/users/me', data),
  delete: (id: string) => api.delete(`/users/students/${id}`),
  getMyScores: () => api.get('/users/me/scores'),
  getPerformance: (studentId: string) => api.get(`/student/performance/${studentId}`),
}

// ── Scores ────────────────────────────────────────────
export const scoreAPI = {
  getAll: () => api.get('/scores'),
  assign: (data: { studentId: string; assessmentId: string; score: number; feedback?: string }) =>
    api.post('/scores', data),
  getAnalytics: () => api.get('/scores/analytics'),
  getStudentScores: (id: string) => api.get(`/scores/student/${id}`),
  delete: (id: string) => api.delete(`/scores/${id}`),
}

// ── Assignments ───────────────────────────────────────
export const adminAssignmentAPI = {
  getAll: () => api.get('/admin/assignments'),
  create: (data: object) => api.post('/admin/assignments', data),
  update: (id: string, data: object) => api.put(`/admin/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/admin/assignments/${id}`),
}

export const studentAssignmentAPI = {
  getAll: () => api.get('/student/assignments'),
}

export const submissionAPI = {
  create: (data: object) => api.post('/student/submissions', data),
  update: (id: string, data: object) => api.put(`/student/submissions/${id}`, data),
  getAllForAdmin: () => api.get('/admin/submissions'),
  grade: (id: string, data: { marks: number }) => api.put(`/admin/submissions/${id}/marks`, data),
}

// ── Quizzes ──────────────────────────────────────────
export const quizAPI = {
  getAll: () => api.get('/quizzes'),
  create: (data: object) => api.post('/quizzes', data),
  update: (id: string, data: object) => api.put(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  getAttempts: () => api.get('/quizzes/attempts'),
  submitAttempt: (quizId: string, data: { answers: number[] }) => api.post(`/quizzes/${quizId}/attempt`, data),
}

// ── Notifications ─────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
}
