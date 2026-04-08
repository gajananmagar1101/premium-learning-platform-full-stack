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
  delete: (id: string) => api.delete(`/users/students/${id}`),
  getMyScores: () => api.get('/users/me/scores'),
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
