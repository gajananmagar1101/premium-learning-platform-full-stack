import type { User } from '@/types'

const ACTIVE_QUIZ_SESSION_KEY = 'active-quiz-session'
const RENDER_URL = 'https://student-learning-platform-api.onrender.com/api'

type ActiveQuizSession = {
  quizId: string
  studentId: string
  answers: number[]
  currentQuestionIndex: number
  endsAt: string
}

const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL
  if (envURL) {
    return envURL.endsWith('/api') ? envURL : `${envURL.replace(/\/$/, '')}/api`
  }
  return import.meta.env.DEV ? 'http://localhost:5002/api' : RENDER_URL
}

const loadActiveQuizSession = () => {
  try {
    const raw = window.localStorage.getItem(ACTIVE_QUIZ_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveQuizSession
  } catch {
    return null
  }
}

export const submitActiveQuizOnLogout = async (user: User | null, token: string | null) => {
  if (!user || user.role !== 'student' || !token) return

  const session = loadActiveQuizSession()
  const userId = user._id ?? user.id

  if (!session || session.studentId !== userId) return

  try {
    await fetch(`${getBaseURL()}/quizzes/${session.quizId}/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers: session.answers }),
      keepalive: true,
    })
  } catch (error) {
    console.error('[QuizSession] Failed to submit active quiz during logout:', error)
  } finally {
    window.localStorage.removeItem(ACTIVE_QUIZ_SESSION_KEY)
  }
}
