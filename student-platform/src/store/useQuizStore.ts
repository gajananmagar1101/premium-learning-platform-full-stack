import { create } from 'zustand'
import type { Quiz, QuizAttempt, QuizQuestion } from '@/types'
import { quizAPI } from '@/lib/services'

interface CreateQuizInput {
  title: string
  subject: string
  className: string
  description?: string
  deadlineAt?: string
  durationMinutes: number
  status: Quiz['status']
  questions: QuizQuestion[]
}

interface SubmitQuizInput {
  quizId: string
  studentId: string
  studentName: string
  studentEmail: string
  className: string
  answers: number[]
}

interface QuizState {
  quizzes: Quiz[]
  attempts: QuizAttempt[]
  loading: boolean
  fetchQuizzes: () => Promise<void>
  fetchAttempts: () => Promise<void>
  createQuiz: (input: CreateQuizInput) => Promise<Quiz>
  updateQuiz: (id: string, input: CreateQuizInput) => Promise<Quiz>
  deleteQuiz: (id: string) => Promise<void>
  submitQuiz: (input: SubmitQuizInput) => Promise<QuizAttempt>
}

const FALLBACK_STORAGE_KEY = 'quiz-store-fallback'
const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeQuizPayload = (input: CreateQuizInput) => ({
  ...input,
  title: input.title.trim(),
  subject: input.subject.trim(),
  className: input.className.trim(),
  description: input.description?.trim() ?? '',
  deadlineAt: input.deadlineAt || undefined,
  questions: input.questions.map((question) => ({
    prompt: question.prompt.trim(),
    options: question.options.map((option) => option.trim()),
    correctOption: question.correctOption,
    points: question.points,
  })),
})

const loadFallbackState = (): Pick<QuizState, 'quizzes' | 'attempts'> => {
  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
    if (!raw) return { quizzes: [], attempts: [] }
    const parsed = JSON.parse(raw) as { quizzes?: Quiz[]; attempts?: QuizAttempt[] }
    return {
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    }
  } catch {
    return { quizzes: [], attempts: [] }
  }
}

const saveFallbackState = (quizzes: Quiz[], attempts: QuizAttempt[]) => {
  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify({ quizzes, attempts }))
  } catch {
    // ignore storage errors
  }
}

const initialFallbackState = typeof window !== 'undefined'
  ? loadFallbackState()
  : { quizzes: [], attempts: [] }

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: initialFallbackState.quizzes,
  attempts: initialFallbackState.attempts,
  loading: false,

  fetchQuizzes: async () => {
    set({ loading: true })
    try {
      const res = await quizAPI.getAll()
      const quizzes = res.data.quizzes ?? []
      set((state) => {
        saveFallbackState(quizzes, state.attempts)
        return { quizzes }
      })
    } catch {
      // keep fallback/local quizzes
    } finally {
      set({ loading: false })
    }
  },

  fetchAttempts: async () => {
    set({ loading: true })
    try {
      const res = await quizAPI.getAttempts()
      const attempts = res.data.attempts ?? []
      set((state) => {
        saveFallbackState(state.quizzes, attempts)
        return { attempts }
      })
    } catch {
      // keep fallback/local attempts
    } finally {
      set({ loading: false })
    }
  },

  createQuiz: async (input) => {
    try {
      const res = await quizAPI.create(normalizeQuizPayload(input))
      const quiz = res.data.quiz as Quiz
      set((state) => {
        const quizzes = [quiz, ...state.quizzes]
        saveFallbackState(quizzes, state.attempts)
        return { quizzes }
      })
      return quiz
    } catch {
      const now = new Date().toISOString()
      const quiz: Quiz = {
        id: createId(),
        ...normalizeQuizPayload(input),
        questions: input.questions,
        totalPoints: input.questions.reduce((sum, question) => sum + question.points, 0),
        createdAt: now,
        updatedAt: now,
      }
      set((state) => {
        const quizzes = [quiz, ...state.quizzes]
        saveFallbackState(quizzes, state.attempts)
        return { quizzes }
      })
      return quiz
    }
  },

  updateQuiz: async (id, input) => {
    try {
      const res = await quizAPI.update(id, normalizeQuizPayload(input))
      const quiz = res.data.quiz as Quiz
      set((state) => {
        const quizzes = state.quizzes.map((item) => (item.id === id ? quiz : item))
        saveFallbackState(quizzes, state.attempts)
        return { quizzes }
      })
      return quiz
    } catch {
      const existing = get().quizzes.find((item) => item.id === id)
      const quiz: Quiz = {
        id,
        ...normalizeQuizPayload(input),
        questions: input.questions,
        totalPoints: input.questions.reduce((sum, question) => sum + question.points, 0),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((state) => {
        const quizzes = state.quizzes.map((item) => (item.id === id ? quiz : item))
        saveFallbackState(quizzes, state.attempts)
        return { quizzes }
      })
      return quiz
    }
  },

  deleteQuiz: async (id) => {
    try {
      await quizAPI.delete(id)
    } catch {
      // fallback delete locally
    }
    set((state) => {
      const quizzes = state.quizzes.filter((quiz) => quiz.id !== id)
      const attempts = state.attempts.filter((attempt) => attempt.quizId !== id)
      saveFallbackState(quizzes, attempts)
      return { quizzes, attempts }
    })
  },

  submitQuiz: async (input) => {
    try {
      const res = await quizAPI.submitAttempt(input.quizId, { answers: input.answers })
      const attempt = res.data.attempt as QuizAttempt
      set((state) => {
        const attempts = [
          attempt,
          ...state.attempts.filter((item) => !(item.quizId === input.quizId && item.studentId === input.studentId)),
        ]
        saveFallbackState(state.quizzes, attempts)
        return { attempts }
      })

      if (!get().quizzes.find((quiz) => quiz.id === input.quizId)) {
        await get().fetchQuizzes()
      }

      return attempt
    } catch {
      const quiz = get().quizzes.find((item) => item.id === input.quizId)
      if (!quiz) {
        throw new Error('Quiz not found')
      }
      const score = quiz.questions.reduce((sum, question, index) => (
        input.answers[index] === question.correctOption ? sum + question.points : sum
      ), 0)
      const attempt: QuizAttempt = {
        id: createId(),
        ...input,
        score,
        totalPoints: quiz.totalPoints,
        submittedAt: new Date().toISOString(),
      }
      set((state) => {
        const attempts = [
          attempt,
          ...state.attempts.filter((item) => !(item.quizId === input.quizId && item.studentId === input.studentId)),
        ]
        saveFallbackState(state.quizzes, attempts)
        return { attempts }
      })
      return attempt
    }
  },
}))
