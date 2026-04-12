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

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  attempts: [],
  loading: false,

  fetchQuizzes: async () => {
    set({ loading: true })
    try {
      const res = await quizAPI.getAll()
      set({ quizzes: res.data.quizzes ?? [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchAttempts: async () => {
    set({ loading: true })
    try {
      const res = await quizAPI.getAttempts()
      set({ attempts: res.data.attempts ?? [] })
    } finally {
      set({ loading: false })
    }
  },

  createQuiz: async (input) => {
    const res = await quizAPI.create(normalizeQuizPayload(input))
    const quiz = res.data.quiz as Quiz
    set((state) => ({ quizzes: [quiz, ...state.quizzes] }))
    return quiz
  },

  updateQuiz: async (id, input) => {
    const res = await quizAPI.update(id, normalizeQuizPayload(input))
    const quiz = res.data.quiz as Quiz
    set((state) => ({
      quizzes: state.quizzes.map((item) => (item.id === id ? quiz : item)),
    }))
    return quiz
  },

  deleteQuiz: async (id) => {
    await quizAPI.delete(id)
    set((state) => ({
      quizzes: state.quizzes.filter((quiz) => quiz.id !== id),
      attempts: state.attempts.filter((attempt) => attempt.quizId !== id),
    }))
  },

  submitQuiz: async (input) => {
    const res = await quizAPI.submitAttempt(input.quizId, { answers: input.answers })
    const attempt = res.data.attempt as QuizAttempt
    set((state) => ({
      attempts: [
        attempt,
        ...state.attempts.filter((item) => !(item.quizId === input.quizId && item.studentId === input.studentId)),
      ],
    }))

    if (!get().quizzes.find((quiz) => quiz.id === input.quizId)) {
      await get().fetchQuizzes()
    }

    return attempt
  },
}))
