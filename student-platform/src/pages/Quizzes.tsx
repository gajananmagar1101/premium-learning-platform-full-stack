import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ClipboardCheck, Edit3, Eye, Filter, Plus, Sparkles, TimerReset, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuizStore } from '@/store/useQuizStore'
import { useUIStore } from '@/store/useUIStore'
import { quizAPI, studentAPI } from '@/lib/services'
import { btechYearOptions, formatAcademicYearLabel, normalizeAcademicYear } from '@/lib/btech'
import type { AiGeneratedQuizQuestion, AiQuizStatus, Quiz, QuizQuestion } from '@/types'

type QuizFormData = {
  title: string
  subject: string
  className: string
  description?: string
  deadlineAt: string
  durationMinutes: number
  status: Quiz['status']
}

type AiQuizFormData = {
  subject: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
}

type EditableAiQuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  selected: boolean
}

const questionTemplate = (): QuizQuestion => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  prompt: '',
  options: ['', '', '', ''],
  correctOption: 0,
  points: 1,
})

const createLocalId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatSecondsClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

const formatDurationClock = (durationMinutes: number) => formatSecondsClock(Math.round(durationMinutes * 60))

const formatDurationLabel = (durationMinutes: number) => {
  if (durationMinutes < 60) return `${durationMinutes} min`
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error
    && typeof error === 'object'
    && 'response' in error
    && error.response
    && typeof error.response === 'object'
    && 'data' in error.response
    && error.response.data
    && typeof error.response.data === 'object'
    && 'message' in error.response.data
    && typeof error.response.data.message === 'string'
    && error.response.data.message.trim()
  ) {
    return error.response.data.message.trim()
  }

  return fallback
}

const toDateTimeInputValue = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
}

const ACTIVE_QUIZ_SESSION_KEY = 'active-quiz-session'

type ActiveQuizSession = {
  quizId: string
  studentId: string
  answers: number[]
  currentQuestionIndex: number
  endsAt: string
}

type StudentQuizFilter = 'all' | 'pending' | 'attempted' | 'dueSoon'

const mapAiQuestionToEditable = (question: AiGeneratedQuizQuestion): EditableAiQuizQuestion => ({
  id: `ai-${question.id}-${createLocalId()}`,
  question: question.question,
  options: [...question.options],
  correctAnswer: question.correctAnswer,
  selected: false,
})

const mapAiQuestionToQuizQuestion = (question: EditableAiQuizQuestion): QuizQuestion => {
  const correctOption = question.options.findIndex((option) => option === question.correctAnswer)
  return {
    id: createLocalId(),
    prompt: question.question,
    options: [...question.options],
    correctOption: correctOption >= 0 ? correctOption : 0,
    points: 1,
  }
}

const shuffleQuestions = (questions: QuizQuestion[]) => {
  const next = [...questions]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
  }
  return next
}

function AdminQuizzesView() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { quizzes, attempts, fetchQuizzes, fetchAttempts, createQuiz, updateQuiz, deleteQuiz } = useQuizStore()
  const addToast = useUIStore((state) => state.addToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Quiz | null>(null)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [yearFilter, setYearFilter] = useState<'all' | string>('all')
  const [activeStudentIds, setActiveStudentIds] = useState<string[]>([])
  const isCreateRoute = pathname === '/quizzes/create'
  const [questions, setQuestions] = useState<QuizQuestion[]>([questionTemplate()])
  const [aiForm, setAiForm] = useState<AiQuizFormData>({
    subject: '',
    topic: '',
    difficulty: 'medium',
    questionCount: 5,
  })
  const [aiQuestions, setAiQuestions] = useState<EditableAiQuizQuestion[]>([])
  const [aiStatus, setAiStatus] = useState<AiQuizStatus | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [shuffleBeforeSave, setShuffleBeforeSave] = useState(false)
  const [applySamePoints, setApplySamePoints] = useState(false)
  const [bulkPoints, setBulkPoints] = useState(1)
  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm<QuizFormData>({
    defaultValues: {
      status: 'draft',
      durationMinutes: 20,
      deadlineAt: '',
    },
  })

  const filteredQuizzes = useMemo(
    () => quizzes.filter((quiz) => yearFilter === 'all' || normalizeAcademicYear(quiz.className) === yearFilter),
    [quizzes, yearFilter]
  )

  const questionCount = questions.length
  const selectedAiCount = aiQuestions.filter((question) => question.selected).length
  const isAiAvailable = aiStatus?.available ?? false

  useEffect(() => {
    fetchQuizzes()
    fetchAttempts()
  }, [fetchAttempts, fetchQuizzes])

  useEffect(() => {
    let cancelled = false
    studentAPI.getAll()
      .then((response) => {
        if (cancelled) return
        const ids = (response.data.students ?? [])
          .map((student: { _id?: string; id?: string }) => student._id ?? student.id)
          .filter((studentId: string | undefined): studentId is string => Boolean(studentId))
        setActiveStudentIds(ids)
      })
      .catch((error) => {
        console.error('[Quizzes] Failed to load students for attempt filtering:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isCreateRoute) return

    let cancelled = false
    quizAPI.getAiQuizStatus()
      .then((response) => {
        if (cancelled) return
        setAiStatus(response.data as AiQuizStatus)
        setAiForm((current) => ({
          ...current,
          questionCount: Math.min(current.questionCount, Math.max(1, (response.data as AiQuizStatus).maxQuestionCount)),
        }))
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[Quizzes] Failed to load AI quiz status:', error)
        setAiStatus({
          enabled: false,
          configured: false,
          available: false,
          maxQuestionCount: 15,
          message: 'Unable to verify AI quiz configuration. Make sure the Spring backend is running on port 5003.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [isCreateRoute])

  const visibleAttempts = useMemo(
    () => (activeStudentIds.length === 0
      ? attempts
      : attempts.filter((attempt) => activeStudentIds.includes(attempt.studentId))),
    [activeStudentIds, attempts]
  )

  const quizStats = useMemo(() => ({
    total: quizzes.length,
    published: quizzes.filter((quiz) => quiz.status === 'published').length,
    attempts: visibleAttempts.length,
    average: visibleAttempts.length ? Math.round((visibleAttempts.reduce((sum, attempt) => sum + ((attempt.score / attempt.totalPoints) * 100), 0) / visibleAttempts.length)) : 0,
  }), [quizzes, visibleAttempts])

  const addQuestion = () => {
    setQuestions((current) => {
      const nextQuestion = questionTemplate()
      if (applySamePoints) {
        nextQuestion.points = bulkPoints
      }
      return [...current, nextQuestion]
    })
  }

  useEffect(() => {
    if (!modalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [modalOpen])

  const openCreate = () => {
    navigate('/quizzes/create')
  }

  const openEdit = (quiz: Quiz) => {
    setEditing(quiz)
    setQuestions(quiz.questions.map((question) => ({ ...question, options: [...question.options] })))
    const firstPoints = quiz.questions[0]?.points ?? 1
    const areAllPointsSame = quiz.questions.length > 0 && quiz.questions.every((question) => question.points === firstPoints)
    setApplySamePoints(areAllPointsSame)
    setBulkPoints(firstPoints)
    reset({
      title: quiz.title,
      subject: quiz.subject,
      className: quiz.className,
      description: quiz.description,
      deadlineAt: toDateTimeInputValue(quiz.deadlineAt),
      durationMinutes: quiz.durationMinutes,
      status: quiz.status,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setQuestions([questionTemplate()])
    setAiForm({
      subject: '',
      topic: '',
      difficulty: 'medium',
      questionCount: 5,
    })
    setAiQuestions([])
    setShuffleBeforeSave(false)
    setApplySamePoints(false)
    setBulkPoints(1)
    reset({
      title: '',
      subject: '',
      className: '',
      description: '',
      deadlineAt: '',
      durationMinutes: 20,
      status: 'draft',
    })
    if (isCreateRoute) {
      navigate('/quizzes')
    }
  }

  useEffect(() => {
    if (!isCreateRoute) return
    setEditing(null)
    setQuestions([questionTemplate()])
    setAiForm({
      subject: '',
      topic: '',
      difficulty: 'medium',
      questionCount: 5,
    })
    setAiQuestions([])
    setShuffleBeforeSave(false)
    setApplySamePoints(false)
    setBulkPoints(1)
    reset({
      title: '',
      subject: '',
      className: '',
      description: '',
      deadlineAt: '',
      durationMinutes: 20,
      status: 'draft',
    })
  }, [isCreateRoute, reset])

  useEffect(() => {
    if (!applySamePoints) return
    setQuestions((current) => {
      let changed = false
      const next = current.map((question) => {
        if (question.points === bulkPoints) return question
        changed = true
        return { ...question, points: bulkPoints }
      })
      return changed ? next : current
    })
  }, [applySamePoints, bulkPoints])

  const updateQuestion = (questionId: string, updater: (question: QuizQuestion) => QuizQuestion) => {
    setQuestions((current) => current.map((question) => question.id === questionId ? updater(question) : question))
  }

  const updateAiQuestion = (questionId: string, updater: (question: EditableAiQuizQuestion) => EditableAiQuizQuestion) => {
    setAiQuestions((current) => current.map((question) => question.id === questionId ? updater(question) : question))
  }

  const handleGenerateAiQuiz = async () => {
    if (aiStatus && !aiStatus.available) {
      addToast(aiStatus.message, 'error')
      return
    }

    const subject = (aiForm.subject.trim() || getValues('subject')?.trim() || '')
    const topic = aiForm.topic.trim()
    if (!subject || !topic) {
      addToast('Fill subject and topic before generating AI questions', 'error')
      return
    }

    try {
      setGeneratingAi(true)
      const response = await quizAPI.generateAiQuiz({
        subject,
        topic,
        difficulty: aiForm.difficulty,
        questionCount: aiForm.questionCount,
      })
      const nextQuestions = (response.data as AiGeneratedQuizQuestion[]).map(mapAiQuestionToEditable)
      setAiForm((current) => ({ ...current, subject }))
      setAiQuestions(nextQuestions)
      addToast(`${nextQuestions.length} AI question${nextQuestions.length === 1 ? '' : 's'} generated`, 'success')
    } catch (error) {
      console.error('[Quizzes] Failed to generate AI quiz questions:', error)
      addToast(getApiErrorMessage(error, 'Failed to generate AI questions. Check backend AI config and try again.'), 'error')
    } finally {
      setGeneratingAi(false)
    }
  }

  const resetAiQuizDrafts = () => {
    setAiForm((current) => ({
      ...current,
      questionCount: 5,
    }))
    setAiQuestions([])
    addToast('AI quiz drafts reset', 'info')
  }

  const addSelectedAiQuestionsToFinalQuiz = () => {
    const selectedQuestions = aiQuestions.filter((question) => question.selected)
    if (selectedQuestions.length === 0) {
      addToast('Select at least one AI question first', 'info')
      return
    }

    setQuestions((current) => {
      const existingKeys = new Set(current.map((question) => `${question.prompt.toLowerCase()}::${question.options.join('|').toLowerCase()}`))
      const additions = selectedQuestions
        .filter((question) => !existingKeys.has(`${question.question.toLowerCase()}::${question.options.join('|').toLowerCase()}`))
        .map(mapAiQuestionToQuizQuestion)

      if (additions.length === 0) {
        addToast('Selected AI questions are already in the final quiz list', 'info')
        return current
      }

      addToast(`${additions.length} AI question${additions.length === 1 ? '' : 's'} added to final quiz`, 'success')
      return [...current, ...additions]
    })

    setAiQuestions((current) => current.map((question) => ({ ...question, selected: false })))
  }

  const onSubmit = async (data: QuizFormData) => {
    if (questions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()))) {
      addToast('Fill all question prompts and options', 'error')
      return
    }

    const finalQuestions = shuffleBeforeSave ? shuffleQuestions(questions) : questions

    try {
      if (editing) {
        await updateQuiz(editing.id, {
          ...data,
          description: data.description?.trim() ?? '',
          deadlineAt: data.deadlineAt ? new Date(data.deadlineAt).toISOString() : undefined,
          questions: finalQuestions,
          durationMinutes: Number(data.durationMinutes),
        })
        addToast('Quiz updated', 'success')
        closeModal()
      } else {
        await createQuiz({
          ...data,
          description: data.description?.trim() ?? '',
          deadlineAt: data.deadlineAt ? new Date(data.deadlineAt).toISOString() : undefined,
          questions: finalQuestions,
          durationMinutes: Number(data.durationMinutes),
        })
        addToast('Quiz created', 'success')
        navigate('/quizzes')
      }
    } catch (error) {
      console.error('[Quizzes] Failed to save quiz:', error)
      addToast('Failed to save quiz. Please try again.', 'error')
    }
  }

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return
    try {
      await deleteQuiz(quizToDelete.id)
      addToast('Quiz deleted', 'success')
      setQuizToDelete(null)
    } catch (error) {
      console.error('[Quizzes] Failed to delete quiz:', error)
      addToast('Failed to delete quiz', 'error')
    }
  }

  const attemptsByQuiz = useMemo(
    () => visibleAttempts.reduce<Record<string, number>>((collection, attempt) => {
      collection[attempt.quizId] = (collection[attempt.quizId] ?? 0) + 1
      return collection
    }, {}),
    [visibleAttempts]
  )

  if (isCreateRoute) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Create Quiz</h3>
          <button type="button" onClick={() => navigate('/quizzes')} className="btn-ghost px-3 py-2 text-xs">Back</button>
        </div>
        <GlassCard className="w-full p-5">
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Quiz Title</label>
                <input {...register('title', { required: true })} className="form-input" />
                {errors.title && <p className="text-xs text-red-400 mt-1">Quiz title is required.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Subject</label>
                <input {...register('subject', { required: true })} className="form-input" />
                {errors.subject && <p className="text-xs text-red-400 mt-1">Subject is required.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Academic Year</label>
                <select {...register('className', { required: true })} className="form-input">
                  <option value="">Select B.Tech year</option>
                  {btechYearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {errors.className && <p className="text-xs text-red-400 mt-1">Academic year is required.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Duration</label>
                <input type="number" min={5} {...register('durationMinutes', { required: true, valueAsNumber: true })} className="form-input" />
                {errors.durationMinutes && <p className="text-xs text-red-400 mt-1">Duration is required.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Status</label>
                <select {...register('status', { required: true })} className="form-input">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
                {errors.status && <p className="text-xs text-red-400 mt-1">Status is required.</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Deadline (Optional)</label>
              <input type="datetime-local" {...register('deadlineAt')} className="form-input" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Description</label>
              <textarea {...register('description')} rows={3} className="form-input resize-none" placeholder="Optional quiz description..." />
            </div>

            <div className="rounded-3xl border border-indigo-200/50 bg-indigo-500/5 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Generate AI Quiz</p>
                  <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                    Generate draft questions, review them, then mix selected AI questions with your manual questions.
                  </p>
                  {aiStatus && (
                    <p className={`mt-2 text-xs ${aiStatus.available ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {aiStatus.message}
                    </p>
                  )}
                  {!aiStatus && (
                    <p className="mt-2 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      Checking Spring backend AI configuration...
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetAiQuizDrafts}
                    disabled={generatingAi}
                    className="btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <TimerReset size={13} /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAiQuiz}
                    disabled={generatingAi || !isAiAvailable}
                    className="btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles size={13} /> {generatingAi ? 'Generating...' : isAiAvailable ? 'Generate AI Quiz' : 'AI Not Configured'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Subject</label>
                  <input
                    value={aiForm.subject}
                    onChange={(event) => setAiForm((current) => ({ ...current, subject: event.target.value }))}
                    className="form-input"
                    placeholder="e.g. Data Structures"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Topic</label>
                  <input
                    value={aiForm.topic}
                    onChange={(event) => setAiForm((current) => ({ ...current, topic: event.target.value }))}
                    className="form-input"
                    placeholder="e.g. Linked Lists"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Difficulty</label>
                  <select
                    value={aiForm.difficulty}
                    onChange={(event) => setAiForm((current) => ({ ...current, difficulty: event.target.value as AiQuizFormData['difficulty'] }))}
                    className="form-input"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={aiStatus?.maxQuestionCount ?? 15}
                    value={aiForm.questionCount}
                    onChange={(event) => setAiForm((current) => ({
                      ...current,
                      questionCount: Math.max(1, Math.min(aiStatus?.maxQuestionCount ?? 15, Number(event.target.value) || 1)),
                    }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-light-border bg-white/55 p-3 dark:border-dark-border dark:bg-dark-card2/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">AI Question Drafts</p>
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      {aiQuestions.length} generated · {selectedAiCount} selected for final quiz
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setAiQuestions((current) => current.map((question) => ({ ...question, selected: true })))} className="btn-ghost px-3 py-2 text-xs">
                      Select All
                    </button>
                    <button type="button" onClick={addSelectedAiQuestionsToFinalQuiz} className="btn-ghost px-3 py-2 text-xs">
                      Add Selected to Final Quiz
                    </button>
                  </div>
                </div>

                {!aiQuestions.length ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-light-border p-4 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                    Generate AI questions to review them here.
                  </p>
                ) : (
                  <div className="slim-scrollbar mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                    {aiQuestions.map((question, index) => (
                      <div key={question.id} className="rounded-2xl border border-light-border bg-white/60 p-4 dark:border-dark-border dark:bg-dark-card2/70">
                        <div className="flex items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                            <input
                              type="checkbox"
                              checked={question.selected}
                              onChange={() => updateAiQuestion(question.id, (current) => ({ ...current, selected: !current.selected }))}
                            />
                            AI Question {index + 1}
                          </label>
                          <button
                            type="button"
                            onClick={() => setAiQuestions((current) => current.filter((item) => item.id !== question.id))}
                            className="text-xs font-medium text-red-400"
                          >
                            Delete
                          </button>
                        </div>

                        <input
                          value={question.question}
                          onChange={(event) => updateAiQuestion(question.id, (current) => ({ ...current, question: event.target.value }))}
                          className="form-input mt-3"
                          placeholder="Edit AI question"
                        />

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <input
                              key={`${question.id}-${optionIndex}`}
                              value={option}
                              onChange={(event) => updateAiQuestion(question.id, (current) => {
                                const nextOptions = current.options.map((item, index2) => index2 === optionIndex ? event.target.value : item)
                                const currentCorrectOption = current.options.findIndex((item) => item === current.correctAnswer)
                                const nextCorrectAnswer = currentCorrectOption === optionIndex ? event.target.value : current.correctAnswer
                                return {
                                  ...current,
                                  options: nextOptions,
                                  correctAnswer: nextCorrectAnswer,
                                }
                              })}
                              className="form-input"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          ))}
                        </div>

                        <div className="mt-3 w-full sm:w-56">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Correct Answer</label>
                          <select
                            value={question.correctAnswer}
                            onChange={(event) => updateAiQuestion(question.id, (current) => ({ ...current, correctAnswer: event.target.value }))}
                            className="form-input"
                          >
                            {question.options.map((option, optionIndex) => (
                              <option key={`${question.id}-correct-${optionIndex}`} value={option}>
                                {option || `Option ${optionIndex + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Final Quiz Questions</p>
                  <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                    Manual questions plus any AI questions you add to the final quiz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-light-border px-3 py-2 text-xs font-medium text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                    <input
                      type="checkbox"
                      checked={applySamePoints}
                      onChange={(event) => setApplySamePoints(event.target.checked)}
                    />
                    All Same Points
                  </label>
                  {applySamePoints && (
                    <input
                      type="number"
                      min={1}
                      value={bulkPoints}
                      onChange={(event) => setBulkPoints(Math.max(1, Number(event.target.value) || 1))}
                      className="form-input h-9 w-24"
                    />
                  )}
                  <button type="button" onClick={addQuestion} className="btn-ghost px-3 py-2 text-xs">
                    <Plus size={13} /> Add Question
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-light-border px-3 py-2 text-xs text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                {questionCount} final question{questionCount === 1 ? '' : 's'} ready
              </div>
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-light-border p-4 dark:border-dark-border">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">Question {index + 1}</p>
                    {questionCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                        className="text-xs font-medium text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    value={question.prompt}
                    onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, prompt: event.target.value }))}
                    className="form-input mt-3"
                    placeholder="Enter question prompt"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                        <input
                          value={option}
                          onChange={(event) => updateQuestion(question.id, (current) => ({
                            ...current,
                            options: current.options.map((item, index2) => index2 === optionIndex ? event.target.value : item),
                          }))}
                          className="form-input"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateQuestion(question.id, (current) => ({ ...current, correctOption: optionIndex }))}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${question.correctOption === optionIndex ? 'bg-emerald-500 text-white' : 'bg-light-card2 text-light-ink-muted dark:bg-dark-card2 dark:text-dark-ink-muted'}`}
                        >
                          Correct
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 w-36">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Points</label>
                    <input
                      type="number"
                      min={1}
                      value={question.points}
                      onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, points: Number(event.target.value) || 1 }))}
                      disabled={applySamePoints}
                      className="form-input disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl border border-light-border px-3 py-2 text-xs font-medium text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
              <input
                type="checkbox"
                checked={shuffleBeforeSave}
                onChange={(event) => setShuffleBeforeSave(event.target.checked)}
              />
              Shuffle questions before saving
            </label>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => navigate('/quizzes')} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center">Create Final Quiz</button>
            </div>
          </form>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Quiz Control Center</h2>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Build online quizzes, publish them to B.Tech cohorts, and review attempt performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openCreate} className="btn-ghost justify-center">
              <Sparkles size={16} /> Generate AI Quiz
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openCreate} className="btn-primary justify-center">
              <Plus size={16} /> Create Quiz
            </motion.button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Total Quizzes</p>
          <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{quizStats.total}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Published</p>
          <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{quizStats.published}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Attempts</p>
          <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{quizStats.attempts}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Avg Quiz Score</p>
          <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{quizStats.average}%</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Quiz Library</h3>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">Publish subject-wise tests for each B.Tech cohort.</p>
          </div>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="form-input md:w-56">
            <option value="all">All cohorts</option>
            {btechYearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="mt-5 grid gap-4">
          {filteredQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-light-border p-8 text-center text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
              No quizzes available for this cohort yet.
            </div>
          ) : filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="rounded-2xl border border-light-border bg-white/35 p-5 dark:border-dark-border dark:bg-dark-card2/40">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge label={quiz.status} variant={quiz.status === 'published' ? 'success' : quiz.status === 'closed' ? 'danger' : 'warning'} />
                    <Badge label={formatAcademicYearLabel(quiz.className)} variant="info" />
                    <Badge label={`${quiz.questions.length} questions`} variant="info" />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">{quiz.title}</p>
                  <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                    {quiz.subject} · {formatDurationClock(quiz.durationMinutes)} · {quiz.totalPoints} points · {attemptsByQuiz[quiz.id] ?? 0} attempts
                  </p>
                  {quiz.deadlineAt && (
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      Deadline: {formatDateTime(quiz.deadlineAt)}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-6 text-light-ink-secondary dark:text-dark-ink-secondary">
                    {quiz.description?.trim() ? quiz.description : 'No description added.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(quiz)} className="btn-ghost px-3 py-2 text-xs">
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizToDelete(quiz)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-light-border px-5 py-4 dark:border-dark-border">
          <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Recent Quiz Attempts</h3>
          <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">Track learner quiz submissions and performance.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Learner', 'Quiz', 'Cohort', 'Score', 'Submitted'].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-light-ink-muted dark:text-dark-ink-muted">
                    No quiz attempts yet.
                  </td>
                </tr>
              ) : visibleAttempts.slice(0, 8).map((attempt) => {
                const quiz = quizzes.find((item) => item.id === attempt.quizId)
                const percent = Math.round((attempt.score / attempt.totalPoints) * 100)
                return (
                  <tr key={attempt.id}>
                    <td>
                      <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{attempt.studentName}</p>
                      <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{attempt.studentEmail}</p>
                    </td>
                    <td>
                      <p className="font-medium text-light-ink-primary dark:text-dark-ink-primary">{quiz?.title ?? 'Quiz'}</p>
                      <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{quiz?.subject ?? 'Subject'}</p>
                    </td>
                    <td>{formatAcademicYearLabel(attempt.className)}</td>
                    <td>
                      <Badge label={`${attempt.score}/${attempt.totalPoints} (${percent}%)`} variant={percent >= 70 ? 'success' : 'warning'} />
                    </td>
                    <td>{formatDateTime(attempt.submittedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm">
          <div className="mx-auto h-full w-full overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{editing ? 'Edit Quiz' : 'Create Quiz'}</h3>
              <button type="button" onClick={closeModal} className="btn-ghost px-3 py-2 text-xs">Close</button>
            </div>
            <GlassCard className="mx-auto w-full max-w-5xl p-5">
              <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Quiz Title</label>
                    <input {...register('title', { required: true })} className="form-input" />
                    {errors.title && <p className="text-xs text-red-400 mt-1">Quiz title is required.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Subject</label>
                    <input {...register('subject', { required: true })} className="form-input" />
                    {errors.subject && <p className="text-xs text-red-400 mt-1">Subject is required.</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Academic Year</label>
                    <select {...register('className', { required: true })} className="form-input">
                      <option value="">Select B.Tech year</option>
                      {btechYearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {errors.className && <p className="text-xs text-red-400 mt-1">Academic year is required.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Duration</label>
                    <input type="number" min={5} {...register('durationMinutes', { required: true, valueAsNumber: true })} className="form-input" />
                    {errors.durationMinutes && <p className="text-xs text-red-400 mt-1">Duration is required.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Status</label>
                    <select {...register('status', { required: true })} className="form-input">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </select>
                    {errors.status && <p className="text-xs text-red-400 mt-1">Status is required.</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Deadline (Optional)</label>
                  <input type="datetime-local" {...register('deadlineAt')} className="form-input" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Description</label>
                  <textarea {...register('description')} rows={3} className="form-input resize-none" placeholder="Optional quiz description..." />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Questions</p>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-light-border px-3 py-2 text-xs font-medium text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                        <input
                          type="checkbox"
                          checked={applySamePoints}
                          onChange={(event) => setApplySamePoints(event.target.checked)}
                        />
                        All Same Points
                      </label>
                      {applySamePoints && (
                        <input
                          type="number"
                          min={1}
                          value={bulkPoints}
                          onChange={(event) => setBulkPoints(Math.max(1, Number(event.target.value) || 1))}
                          className="form-input h-9 w-24"
                        />
                      )}
                      <button type="button" onClick={addQuestion} className="btn-ghost px-3 py-2 text-xs">
                        <Plus size={13} /> Add Question
                      </button>
                    </div>
                  </div>
                  {questions.map((question, index) => (
                    <div key={question.id} className="rounded-2xl border border-light-border p-4 dark:border-dark-border">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">Question {index + 1}</p>
                        {questionCount > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                            className="text-xs font-medium text-red-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        value={question.prompt}
                        onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, prompt: event.target.value }))}
                        className="form-input mt-3"
                        placeholder="Enter question prompt"
                      />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                            <input
                              value={option}
                              onChange={(event) => updateQuestion(question.id, (current) => ({
                                ...current,
                                options: current.options.map((item, index2) => index2 === optionIndex ? event.target.value : item),
                              }))}
                              className="form-input"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => updateQuestion(question.id, (current) => ({ ...current, correctOption: optionIndex }))}
                              className={`rounded-xl px-3 py-2 text-xs font-semibold ${question.correctOption === optionIndex ? 'bg-emerald-500 text-white' : 'bg-light-card2 text-light-ink-muted dark:bg-dark-card2 dark:text-dark-ink-muted'}`}
                            >
                              Correct
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 w-36">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Points</label>
                        <input
                          type="number"
                          min={1}
                          value={question.points}
                          onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, points: Number(event.target.value) || 1 }))}
                          disabled={applySamePoints}
                          className="form-input disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">
                    {editing ? 'Update Quiz' : 'Create Quiz'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      <Modal open={Boolean(quizToDelete)} onClose={() => setQuizToDelete(null)} title="Delete Quiz">
        <div className="space-y-4">
          <p className="text-sm text-light-ink-secondary dark:text-dark-ink-secondary">
            Delete <span className="font-semibold">{quizToDelete?.title}</span>? Related attempts will also be removed.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setQuizToDelete(null)} className="btn-ghost">Cancel</button>
            <button type="button" onClick={handleDeleteQuiz} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white">
              <Trash2 size={14} /> Delete Quiz
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StudentQuizzesView() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { quizId: routeQuizId } = useParams<{ quizId: string }>()
  const user = useAuthStore((state) => state.user)
  const { quizzes, attempts, fetchQuizzes, fetchAttempts, submitQuiz } = useQuizStore()
  const addToast = useUIStore((state) => state.addToast)
  const [activeSession, setActiveSession] = useState<ActiveQuizSession | null>(null)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0)
  const [quizzesLoaded, setQuizzesLoaded] = useState(false)
  const [sessionRestored, setSessionRestored] = useState(false)
  const [quizSearch, setQuizSearch] = useState('')
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [studentQuizFilter, setStudentQuizFilter] = useState<StudentQuizFilter>('all')
  const userId = user?._id ?? user?.id
  const cohort = normalizeAcademicYear(user?.grade)
  const isAttemptRoute = pathname.startsWith('/quizzes/attempt/')
  const activeQuiz = useMemo(
    () => (activeSession ? quizzes.find((quiz) => quiz.id === activeSession.quizId) ?? null : null),
    [activeSession, quizzes]
  )

  useEffect(() => {
    let cancelled = false
    setQuizzesLoaded(false)
    fetchQuizzes()
      .catch((error) => {
        console.error('[Quizzes] Failed to load quizzes:', error)
        addToast('Failed to load quizzes. Please refresh and try again.', 'error')
      })
      .finally(() => {
        if (!cancelled) setQuizzesLoaded(true)
      })
    fetchAttempts().catch((error) => {
      console.error('[Quizzes] Failed to load quiz attempts:', error)
    })
    return () => {
      cancelled = true
    }
  }, [addToast, fetchAttempts, fetchQuizzes])

  const availableQuizzes = useMemo(
    () => quizzes.filter((quiz) => {
      if (quiz.status !== 'published' || normalizeAcademicYear(quiz.className) !== cohort) return false
      if (!quiz.deadlineAt) return true
      return new Date(quiz.deadlineAt).getTime() >= Date.now()
    }),
    [cohort, quizzes]
  )

  const studentAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.studentId === userId),
    [attempts, userId]
  )

  const attemptedQuizIds = useMemo(
    () => new Set(studentAttempts.map((attempt) => attempt.quizId)),
    [studentAttempts]
  )
  const searchableQuery = quizSearch.trim().toLowerCase()

  const orderedAvailableQuizzes = useMemo(
    () => [...availableQuizzes].sort((a, b) => {
      const aAttempted = attemptedQuizIds.has(a.id)
      const bAttempted = attemptedQuizIds.has(b.id)
      if (aAttempted !== bAttempted) return aAttempted ? 1 : -1
      return a.title.localeCompare(b.title)
    }),
    [availableQuizzes, attemptedQuizIds]
  )

  const filteredAvailableQuizzes = useMemo(
    () => orderedAvailableQuizzes.filter((quiz) => {
      const matchesQuery = searchableQuery.length === 0
        || quiz.title.toLowerCase().includes(searchableQuery)
        || quiz.subject.toLowerCase().includes(searchableQuery)
      const attempted = attemptedQuizIds.has(quiz.id)
      const dueSoon = quiz.deadlineAt
        ? new Date(quiz.deadlineAt).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 2
        : false

      const matchesFilter =
        studentQuizFilter === 'all'
        || (studentQuizFilter === 'pending' && !attempted)
        || (studentQuizFilter === 'attempted' && attempted)
        || (studentQuizFilter === 'dueSoon' && dueSoon)

      return matchesQuery && matchesFilter
    }),
    [attemptedQuizIds, orderedAvailableQuizzes, searchableQuery, studentQuizFilter]
  )

  const sortedStudentAttempts = useMemo(
    () => [...studentAttempts]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [studentAttempts]
  )

  const filteredStudentAttempts = useMemo(
    () => sortedStudentAttempts.filter((attempt) => {
      const quiz = quizzes.find((item) => item.id === attempt.quizId)
      if (!quiz) return searchableQuery.length === 0
      return searchableQuery.length === 0
        || quiz.title.toLowerCase().includes(searchableQuery)
        || quiz.subject.toLowerCase().includes(searchableQuery)
    }),
    [quizzes, searchableQuery, sortedStudentAttempts]
  )

  const selectedAttempt = useMemo(
    () => sortedStudentAttempts.find((attempt) => attempt.id === selectedAttemptId) ?? null,
    [selectedAttemptId, sortedStudentAttempts]
  )

  const selectedQuiz = useMemo(
    () => (selectedAttempt ? quizzes.find((quiz) => quiz.id === selectedAttempt.quizId) ?? null : null),
    [quizzes, selectedAttempt]
  )

  useEffect(() => {
    if (!userId) return
    try {
      const raw = window.localStorage.getItem(ACTIVE_QUIZ_SESSION_KEY)
      if (!raw) {
        setSessionRestored(true)
        return
      }
      const parsed = JSON.parse(raw) as ActiveQuizSession
      if (parsed.studentId !== userId) {
        setSessionRestored(true)
        return
      }
      setActiveSession(parsed)
    } catch (error) {
      console.error('[Quizzes] Failed to restore active quiz session:', error)
    } finally {
      setSessionRestored(true)
    }
  }, [userId])

  useEffect(() => {
    if (!sessionRestored) return
    if (!activeSession) {
      window.localStorage.removeItem(ACTIVE_QUIZ_SESSION_KEY)
      return
    }
    window.localStorage.setItem(ACTIVE_QUIZ_SESSION_KEY, JSON.stringify(activeSession))
  }, [activeSession, sessionRestored])

  useEffect(() => {
    if (!sessionRestored || !activeSession || attemptedQuizIds.has(activeSession.quizId)) return
    const timeoutId = window.setTimeout(() => {
      void quizAPI.updateSession(activeSession.quizId, {
        answers: activeSession.answers,
        currentQuestionIndex: activeSession.currentQuestionIndex,
      }).catch((error) => {
        console.error('[Quizzes] Failed to sync active quiz session:', error)
      })
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [activeSession, attemptedQuizIds, sessionRestored])

  const openQuiz = async (quiz: Quiz) => {
    if (!userId) return
    if (activeSession?.quizId === quiz.id) {
      navigate(`/quizzes/attempt/${quiz.id}`)
      return
    }
    if (activeSession?.quizId && activeSession.quizId !== quiz.id) {
      addToast('Another quiz is already in progress. Resume or submit that quiz first.', 'info')
      return
    }

    try {
      const response = await quizAPI.startSession(quiz.id)
      const session = response.data.session as ActiveQuizSession
      setActiveSession({
        quizId: session.quizId,
        studentId: session.studentId,
        answers: session.answers ?? Array(quiz.questions.length).fill(-1),
        currentQuestionIndex: session.currentQuestionIndex ?? 0,
        endsAt: session.endsAt,
      })
      navigate(`/quizzes/attempt/${quiz.id}`)
    } catch (error) {
      console.error('[Quizzes] Failed to start quiz session:', error)
      addToast('Failed to start quiz. Please try again.', 'error')
    }
  }

  const closeQuizView = () => {
    navigate('/quizzes')
  }

  const clearActiveSession = () => {
    setActiveSession(null)
    setTimeLeftSeconds(0)
    if (isAttemptRoute) {
      navigate('/quizzes')
    }
  }

  useEffect(() => {
    if (!activeSession) {
      setTimeLeftSeconds(0)
      return
    }

    const updateTime = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(activeSession.endsAt).getTime() - Date.now()) / 1000)
      )
      setTimeLeftSeconds(remaining)
    }

    updateTime()
    const intervalId = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(intervalId)
  }, [activeSession])

  const handleSubmitQuiz = async (forceSubmit = false) => {
    if (!activeQuiz || !user || !userId || !activeSession) return
    if (!forceSubmit && activeSession.answers.some((answer) => answer < 0)) {
      addToast('Answer all questions before submitting', 'error')
      return
    }

    try {
      const attempt = await submitQuiz({
        quizId: activeQuiz.id,
        studentId: userId,
        studentName: user.name,
        studentEmail: user.email,
        className: activeQuiz.className,
        answers: activeSession.answers,
      })
      addToast(`Quiz submitted. Score: ${attempt.score}/${attempt.totalPoints}`, 'success')
      clearActiveSession()
      setSelectedAttemptId(attempt.id)
    } catch (error) {
      console.error('[Quizzes] Failed to submit attempt:', error)
      addToast('Failed to submit quiz attempt. Please try again.', 'error')
    }
  }

  useEffect(() => {
    if (!activeSession || !activeQuiz) return
    const endsAtMs = new Date(activeSession.endsAt).getTime()
    if (Number.isNaN(endsAtMs)) return
    if (Date.now() < endsAtMs) return
    void handleSubmitQuiz(true)
  }, [activeQuiz, activeSession, timeLeftSeconds])

  useEffect(() => {
    if (!activeSession || !quizzesLoaded) return
    if (!activeQuiz) {
      clearActiveSession()
      return
    }
    if (attemptedQuizIds.has(activeSession.quizId)) {
      clearActiveSession()
    }
  }, [activeQuiz, activeSession, attemptedQuizIds, quizzesLoaded])

  useEffect(() => {
    if (!isAttemptRoute || !routeQuizId) return
    if (!activeSession) return
    if (activeSession.quizId !== routeQuizId) {
      navigate('/quizzes')
    }
  }, [activeSession, isAttemptRoute, navigate, routeQuizId])

  const averageScore = studentAttempts.length
    ? Math.round(studentAttempts.reduce((sum, attempt) => sum + ((attempt.score / attempt.totalPoints) * 100), 0) / studentAttempts.length)
    : 0
  const bestScore = studentAttempts.length
    ? Math.max(...studentAttempts.map((attempt) => Math.round((attempt.score / attempt.totalPoints) * 100)))
    : 0
  const notAttemptedCount = Math.max(availableQuizzes.length - attemptedQuizIds.size, 0)
  const dueSoonCount = availableQuizzes.filter((quiz) => (
    quiz.deadlineAt
      ? new Date(quiz.deadlineAt).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 2
      : false
  )).length
  const nextPendingQuiz = [...availableQuizzes]
    .filter((quiz) => !attemptedQuizIds.has(quiz.id))
    .sort((left, right) => {
      const leftTime = left.deadlineAt ? new Date(left.deadlineAt).getTime() : Number.MAX_SAFE_INTEGER
      const rightTime = right.deadlineAt ? new Date(right.deadlineAt).getTime() : Number.MAX_SAFE_INTEGER
      return leftTime - rightTime
    })[0] ?? null
  const totalQuestions = activeQuiz?.questions.length ?? 0
  const currentQuestionIndex = activeSession?.currentQuestionIndex ?? 0
  const isLastQuestion = totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1
  const isFirstQuestion = currentQuestionIndex === 0
  const currentQuestion = activeQuiz?.questions[currentQuestionIndex] ?? null
  const answeredCount = activeSession?.answers.filter((answer) => answer >= 0).length ?? 0
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0)

  if (isAttemptRoute && !activeQuiz && !quizzesLoaded) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Restoring quiz session...</p>
      </GlassCard>
    )
  }

  if (isAttemptRoute && !activeQuiz) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">No active quiz session found.</p>
        <button type="button" onClick={() => navigate('/quizzes')} className="btn-primary mt-4 px-4 py-2 text-sm">
          Back to Quizzes
        </button>
      </GlassCard>
    )
  }

  if (isAttemptRoute && activeQuiz) {
    return (
      <div className="min-h-[calc(100vh-8rem)] rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card sm:p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-light-border bg-light-card2/70 p-4 dark:border-dark-border dark:bg-dark-card2/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{activeQuiz.subject}</p>
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      {activeQuiz.questions.length} questions · {formatDurationClock(activeQuiz.durationMinutes)} · {activeQuiz.totalPoints} points
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${timeLeftSeconds <= 60 ? 'text-red-500' : 'text-indigo-600'}`}>
                      Time Left: {formatSecondsClock(timeLeftSeconds)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-light-ink-muted dark:text-dark-ink-muted">
                      Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                    </p>
                  </div>
                  <button type="button" onClick={closeQuizView} className="btn-ghost px-3 py-2 text-xs">
                    Back to Quizzes
                  </button>
                </div>
              </div>

              {currentQuestion && (
                <div className="rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-light-ink-primary dark:text-dark-ink-primary">
                      Q{currentQuestionIndex + 1}. {currentQuestion.prompt}
                    </p>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600">
                      {currentQuestion.points} point{currentQuestion.points === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="slim-scrollbar max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                    {currentQuestion.options.map((option, optionIndex) => (
                      <label key={`${currentQuestion.id}-${optionIndex}`} className="flex items-start gap-3 rounded-xl border border-light-border px-3 py-2 text-sm text-light-ink-secondary transition-colors hover:bg-light-hover dark:border-dark-border dark:text-dark-ink-secondary dark:hover:bg-dark-hover">
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          checked={activeSession?.answers[currentQuestionIndex] === optionIndex}
                          onChange={() => setActiveSession((current) => {
                            if (!current) return current
                            return {
                              ...current,
                              answers: current.answers.map((answer, answerIndex) => (
                                answerIndex === currentQuestionIndex ? optionIndex : answer
                              )),
                            }
                          })}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={closeQuizView} className="btn-ghost flex-1 justify-center">Save & Exit</button>
                <button
                  type="button"
                  disabled={isFirstQuestion}
                  onClick={() => setActiveSession((current) => {
                    if (!current) return current
                    return { ...current, currentQuestionIndex: Math.max(0, current.currentQuestionIndex - 1) }
                  })}
                  className="btn-ghost flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {!isLastQuestion ? (
                  <button
                    type="button"
                    onClick={() => setActiveSession((current) => {
                      if (!current || !activeQuiz) return current
                      return {
                        ...current,
                        currentQuestionIndex: Math.min(activeQuiz.questions.length - 1, current.currentQuestionIndex + 1),
                      }
                    })}
                    className="btn-primary flex-1 justify-center"
                  >
                    Next
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSubmitQuiz()} className="btn-primary flex-1 justify-center">
                    <CheckCircle2 size={14} /> Submit Quiz
                  </button>
                )}
              </div>
            </div>

            <GlassCard className="flex h-fit min-h-0 flex-col p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Attempt Overview</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
                  <p className="text-[11px] text-light-ink-muted dark:text-dark-ink-muted">Answered</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">{answeredCount}</p>
                </div>
                <div className="rounded-2xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
                  <p className="text-[11px] text-light-ink-muted dark:text-dark-ink-muted">Remaining</p>
                  <p className="mt-1 text-lg font-semibold text-amber-600">{unansweredCount}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-light-ink-muted dark:text-dark-ink-muted">Question Navigator</p>
                <div className="slim-scrollbar mt-3 grid max-h-[22rem] grid-cols-4 gap-2 overflow-y-auto pr-1">
                  {activeQuiz.questions.map((question, index) => {
                    const answered = (activeSession?.answers[index] ?? -1) >= 0
                    const active = index === currentQuestionIndex
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setActiveSession((current) => current ? { ...current, currentQuestionIndex: index } : current)}
                        className={`rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : answered
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : 'bg-light-card2 text-light-ink-muted dark:bg-dark-card2 dark:text-dark-ink-muted'
                        }`}
                      >
                        Q{index + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Online Quizzes</h2>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Attempt published quizzes for your B.Tech cohort and track your quiz performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={`${availableQuizzes.length} available`} variant="info" />
            <Badge label={`${studentAttempts.length} attempted`} variant="success" />
            <Badge label={`${notAttemptedCount} pending`} variant="warning" />
            <Badge label={`${averageScore}% avg`} variant={averageScore >= 70 ? 'success' : 'warning'} />
            <Badge label={`${bestScore}% best`} variant={bestScore >= 70 ? 'success' : 'info'} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={quizSearch}
            onChange={(event) => setQuizSearch(event.target.value)}
            className="form-input"
            placeholder="Search by quiz title or subject"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'attempted', label: 'Attempted' },
              { key: 'dueSoon', label: 'Due Soon' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStudentQuizFilter(option.key as StudentQuizFilter)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  studentQuizFilter === option.key
                    ? 'bg-indigo-600 text-white'
                    : 'border border-light-border text-light-ink-muted hover:bg-light-hover dark:border-dark-border dark:text-dark-ink-muted dark:hover:bg-dark-hover'
                }`}
              >
                <Filter size={12} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {activeSession && activeQuiz && !isAttemptRoute && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium text-amber-700">
              Quiz in progress: {activeQuiz.title} · Time Left {formatSecondsClock(timeLeftSeconds)}
            </p>
            <button type="button" onClick={() => navigate(`/quizzes/attempt/${activeQuiz.id}`)} className="btn-ghost px-3 py-1.5 text-xs">
              Resume
            </button>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <GlassCard className="p-3.5">
          <p className="text-[11px] font-medium text-light-ink-muted dark:text-dark-ink-muted">Pending Quizzes</p>
          <p className="mt-2 text-2xl font-bold text-indigo-600">{notAttemptedCount}</p>
        </GlassCard>
        <GlassCard className="p-3.5">
          <p className="text-[11px] font-medium text-light-ink-muted dark:text-dark-ink-muted">Due Soon</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{dueSoonCount}</p>
        </GlassCard>
        <GlassCard className="p-3.5">
          <p className="text-[11px] font-medium text-light-ink-muted dark:text-dark-ink-muted">Average Score</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{averageScore}%</p>
        </GlassCard>
        <GlassCard className="p-3.5">
          <p className="text-[11px] font-medium text-light-ink-muted dark:text-dark-ink-muted">Best Score</p>
          <p className="mt-2 text-2xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{bestScore}%</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Available Quizzes</h3>
              <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                Unattempted quizzes are listed first so you can complete pending ones quickly.
              </p>
            </div>
            {nextPendingQuiz ? (
              <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-2 text-right dark:border-indigo-400/20 dark:bg-indigo-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Next Priority</p>
                <p className="mt-1 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{nextPendingQuiz.title}</p>
                <p className="text-[11px] text-light-ink-muted dark:text-dark-ink-muted">
                  {nextPendingQuiz.deadlineAt ? `Due ${formatDateTime(nextPendingQuiz.deadlineAt)}` : 'No deadline set'}
                </p>
              </div>
            ) : null}
          </div>
          <div className="slim-scrollbar mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {filteredAvailableQuizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-light-border p-8 text-center text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                No published quizzes match this search.
              </div>
            ) : filteredAvailableQuizzes.map((quiz) => {
              const attempted = attemptedQuizIds.has(quiz.id)
              const deadlineMs = quiz.deadlineAt ? new Date(quiz.deadlineAt).getTime() : null
              const dueSoon = deadlineMs != null && deadlineMs - Date.now() <= 1000 * 60 * 60 * 24 * 2
              return (
                <div key={quiz.id} className="rounded-[1.6rem] border border-light-border bg-white/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] dark:border-dark-border dark:bg-dark-card2/40">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge label={quiz.subject} variant="info" />
                        <Badge label={formatDurationLabel(quiz.durationMinutes)} variant="info" />
                        <Badge label={`${quiz.totalPoints} pts`} variant="info" />
                        {dueSoon ? <Badge label="Due soon" variant="warning" /> : null}
                        {attempted ? <Badge label="Attempted" variant="success" /> : <Badge label="Pending" variant="warning" />}
                      </div>
                      <p className="mt-3 text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">{quiz.title}</p>
                      <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                        {quiz.questions.length} questions · {formatAcademicYearLabel(quiz.className)}
                      </p>
                      {quiz.deadlineAt && (
                        <p className={`mt-1 text-xs ${dueSoon ? 'text-amber-600' : 'text-light-ink-muted dark:text-dark-ink-muted'}`}>
                          Deadline: {formatDateTime(quiz.deadlineAt)}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-light-ink-secondary dark:text-dark-ink-secondary">
                        {quiz.description?.trim() ? quiz.description : 'No description added.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attempted ? (
                        <button type="button" onClick={() => {
                          const latestAttempt = sortedStudentAttempts.find((attempt) => attempt.quizId === quiz.id)
                          if (latestAttempt) setSelectedAttemptId(latestAttempt.id)
                        }} className="btn-ghost px-3 py-2 text-xs">
                          <Eye size={13} /> Review Result
                        </button>
                      ) : activeSession?.quizId === quiz.id ? (
                        <button type="button" onClick={() => navigate(`/quizzes/attempt/${quiz.id}`)} className="btn-primary px-3 py-2 text-xs">
                          <TimerReset size={13} /> Resume Quiz
                        </button>
                      ) : (
                        <button type="button" onClick={() => openQuiz(quiz)} className="btn-primary px-3 py-2 text-xs">
                          <ClipboardCheck size={13} /> Start Quiz
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-light-border px-5 py-4 dark:border-dark-border">
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">My Quiz Results</h3>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">Latest submitted quiz performance with detailed answer review.</p>
          </div>
          <div className="slim-scrollbar max-h-[34rem] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['Quiz', 'Subject', 'Score', 'Status', 'Submitted', 'Action'].map((heading) => <th key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredStudentAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-light-ink-muted dark:text-dark-ink-muted">
                      No quiz attempts found for this search.
                    </td>
                  </tr>
                ) : filteredStudentAttempts.map((attempt) => {
                  const quiz = quizzes.find((item) => item.id === attempt.quizId)
                  const percent = Math.round((attempt.score / attempt.totalPoints) * 100)
                  const isPassed = percent >= 70
                  return (
                    <tr key={attempt.id}>
                      <td>{quiz?.title ?? 'Quiz'}</td>
                      <td>{quiz?.subject ?? 'Subject'}</td>
                      <td>
                        <Badge label={`${attempt.score}/${attempt.totalPoints} (${percent}%)`} variant={isPassed ? 'success' : 'warning'} />
                      </td>
                      <td><Badge label={isPassed ? 'Passed' : 'Needs Work'} variant={isPassed ? 'success' : 'danger'} /></td>
                      <td>{formatDateTime(attempt.submittedAt)}</td>
                      <td>
                        <button type="button" onClick={() => setSelectedAttemptId(attempt.id)} className="btn-ghost px-3 py-2 text-xs">
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Quiz Tips</h3>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-light-border bg-white/50 p-4 text-sm text-light-ink-secondary dark:border-dark-border dark:bg-dark-card2/60 dark:text-dark-ink-secondary">
            Attempt pending quizzes first so your dashboard stays clean and deadlines stay manageable.
          </div>
          <div className="rounded-2xl border border-light-border bg-white/50 p-4 text-sm text-light-ink-secondary dark:border-dark-border dark:bg-dark-card2/60 dark:text-dark-ink-secondary">
            Use the search and filter chips to quickly find due-soon or already-attempted quizzes.
          </div>
          <div className="rounded-2xl border border-light-border bg-white/50 p-4 text-sm text-light-ink-secondary dark:border-dark-border dark:bg-dark-card2/60 dark:text-dark-ink-secondary">
            During an active attempt, the question navigator helps you jump to unanswered questions before submit.
          </div>
        </div>
      </GlassCard>

      <Modal open={Boolean(selectedAttemptId)} onClose={() => setSelectedAttemptId(null)} title="Quiz Result Breakdown">
        {!selectedAttempt || !selectedQuiz ? (
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Result details are not available for this attempt.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-light-card2/60 p-4 dark:bg-dark-card2/70">
              <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{selectedQuiz.title}</p>
              <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">{selectedQuiz.subject} · {formatDateTime(selectedAttempt.submittedAt)}</p>
              <p className="mt-2 text-sm font-semibold text-indigo-600">
                Score: {selectedAttempt.score}/{selectedAttempt.totalPoints} ({Math.round((selectedAttempt.score / selectedAttempt.totalPoints) * 100)}%)
              </p>
            </div>

            <div className="space-y-3">
              {selectedQuiz.questions.map((question, index) => {
                const selectedOptionIndex = selectedAttempt.answers[index] ?? -1
                const isCorrect = selectedOptionIndex === question.correctOption
                const pointsEarned = isCorrect ? question.points : 0
                const selectedAnswer = selectedOptionIndex >= 0 ? question.options[selectedOptionIndex] : 'Not answered'
                const correctAnswer = question.options[question.correctOption] ?? 'N/A'

                return (
                  <div key={question.id} className="rounded-2xl border border-light-border p-4 dark:border-dark-border">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-light-ink-primary dark:text-dark-ink-primary">Q{index + 1}. {question.prompt}</p>
                      {isCorrect
                        ? <Badge label="Correct" variant="success" />
                        : <Badge label="Incorrect" variant="danger" />}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p className="text-light-ink-secondary dark:text-dark-ink-secondary">
                        <span className="font-medium">Your answer:</span> {selectedAnswer}
                      </p>
                      <p className="text-light-ink-secondary dark:text-dark-ink-secondary">
                        <span className="font-medium">Correct answer:</span> {correctAnswer}
                      </p>
                      <p className="text-light-ink-secondary dark:text-dark-ink-secondary">
                        <span className="font-medium">Points:</span> {pointsEarned}/{question.points}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setSelectedAttemptId(null)} className="btn-primary px-4 py-2 text-sm">
                Close Review
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function Quizzes() {
  const user = useAuthStore((state) => state.user)

  if (user?.role === 'admin') {
    return <AdminQuizzesView />
  }

  return <StudentQuizzesView />
}
