import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Quiz, QuizAttempt, QuizQuestion } from '@/types'

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
  createQuiz: (input: CreateQuizInput) => void
  updateQuiz: (id: string, input: CreateQuizInput) => void
  deleteQuiz: (id: string) => void
  submitQuiz: (input: SubmitQuizInput) => QuizAttempt
}

const calculateTotalPoints = (questions: QuizQuestion[]) =>
  questions.reduce((sum, question) => sum + question.points, 0)

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      quizzes: [],
      attempts: [],

      createQuiz: (input) =>
        set((state) => {
          const now = new Date().toISOString()
          const quiz: Quiz = {
            id: crypto.randomUUID(),
            ...input,
            description: input.description?.trim() ?? '',
            deadlineAt: input.deadlineAt?.trim() || undefined,
            totalPoints: calculateTotalPoints(input.questions),
            createdAt: now,
            updatedAt: now,
          }
          return { quizzes: [quiz, ...state.quizzes] }
        }),

      updateQuiz: (id, input) =>
        set((state) => ({
          quizzes: state.quizzes.map((quiz) =>
            quiz.id === id
              ? {
                  ...quiz,
                  ...input,
                  description: input.description?.trim() ?? '',
                  deadlineAt: input.deadlineAt?.trim() || undefined,
                  totalPoints: calculateTotalPoints(input.questions),
                  updatedAt: new Date().toISOString(),
                }
              : quiz
          ),
        })),

      deleteQuiz: (id) =>
        set((state) => ({
          quizzes: state.quizzes.filter((quiz) => quiz.id !== id),
          attempts: state.attempts.filter((attempt) => attempt.quizId !== id),
        })),

      submitQuiz: (input) => {
        const quiz = get().quizzes.find((item) => item.id === input.quizId)
        if (!quiz) {
          throw new Error('Quiz not found')
        }

        const score = quiz.questions.reduce((sum, question, index) => (
          input.answers[index] === question.correctOption ? sum + question.points : sum
        ), 0)

        const attempt: QuizAttempt = {
          id: crypto.randomUUID(),
          ...input,
          score,
          totalPoints: quiz.totalPoints,
          submittedAt: new Date().toISOString(),
        }

        set((state) => ({
          attempts: [attempt, ...state.attempts.filter((item) => !(item.quizId === input.quizId && item.studentId === input.studentId))],
        }))

        return attempt
      },
    }),
    {
      name: 'quiz-store',
      partialize: (state) => ({
        quizzes: state.quizzes,
        attempts: state.attempts,
      }),
    }
  )
)
