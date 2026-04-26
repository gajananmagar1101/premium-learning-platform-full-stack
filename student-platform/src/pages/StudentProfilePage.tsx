import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, GraduationCap, Mail, Trophy, TrendingUp, Star, FileCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useStudentStore } from '@/store/useStudentStore'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { useQuizStore } from '@/store/useQuizStore'
import { studentAPI } from '@/lib/services'
import { formatAcademicYearLabel, normalizeAcademicYear } from '@/lib/btech'
import type { StudentPerformance } from '@/types'

const getLetterGrade = (percent: number) => {
  if (percent >= 90) return 'A'
  if (percent >= 80) return 'B'
  if (percent >= 70) return 'C'
  if (percent >= 60) return 'D'
  return 'F'
}

export function StudentProfilePage() {
  const navigate = useNavigate()
  const { studentId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const returnGrade = searchParams.get('grade')

  const { students, fetchStudents } = useStudentStore()
  const { submissions, fetchAdminSubmissions } = useAssignmentStore()
  const { quizzes, attempts, fetchQuizzes, fetchAttempts } = useQuizStore()

  const [performance, setPerformance] = useState<StudentPerformance | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(true)
  const [performanceError, setPerformanceError] = useState<string | null>(null)

  useEffect(() => {
    if (students.length === 0) {
      void fetchStudents()
    }
  }, [fetchStudents, students.length])

  useEffect(() => {
    void fetchAdminSubmissions()
    void fetchQuizzes()
    void fetchAttempts()
  }, [fetchAdminSubmissions, fetchAttempts, fetchQuizzes])

  useEffect(() => {
    if (!studentId) return

    let cancelled = false
    const loadPerformance = async () => {
      setLoadingPerformance(true)
      setPerformanceError(null)
      try {
        const res = await studentAPI.getPerformance(studentId)
        if (!cancelled) {
          setPerformance(res.data.performance ?? null)
        }
      } catch (error) {
        const status = (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        if (!cancelled) {
          setPerformance(null)
          if (status && status !== 404) {
            setPerformanceError(message ?? 'Failed to fetch learner performance')
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingPerformance(false)
        }
      }
    }

    void loadPerformance()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const student = useMemo(
    () => students.find((item) => (item._id ?? item.id) === studentId) ?? null,
    [studentId, students]
  )

  const studentSubmissions = useMemo(
    () => submissions.filter((submission) => submission.studentId === studentId),
    [studentId, submissions]
  )

  const assignmentRows = useMemo(
    () =>
      studentSubmissions.map((submission) => {
        const totalMarks = submission.totalMarks || 100
        const marks = submission.marks ?? null
        const percentage = marks == null ? null : Math.round((marks / totalMarks) * 100)
        return {
          id: submission.id,
          title: submission.assignmentTitle,
          subject: submission.subject,
          submittedAt: submission.submittedAt,
          gradedAt: submission.updatedAt,
          totalMarks,
          marks,
          percentage,
          status: submission.status,
        }
      }),
    [studentSubmissions]
  )

  const quizRows = useMemo(
    () =>
      attempts
        .filter((attempt) => attempt.studentId === studentId)
        .map((attempt) => {
          const quiz = quizzes.find((item) => item.id === attempt.quizId)
          const totalMarks = attempt.totalPoints || 1
          const percentage = Math.round((attempt.score / totalMarks) * 100)
          return {
            id: attempt.id,
            title: quiz?.title ?? 'Quiz Attempt',
            subject: quiz?.subject ?? 'Quiz',
            submittedAt: attempt.submittedAt,
            totalMarks,
            marks: attempt.score,
            percentage,
          }
        }),
    [attempts, quizzes, studentId]
  )

  const combinedGradedRows = useMemo(
    () => [
      ...assignmentRows
        .filter((row) => row.percentage != null)
        .map((row) => ({ subject: row.subject, percentage: row.percentage as number })),
      ...quizRows.map((row) => ({ subject: row.subject, percentage: row.percentage })),
    ],
    [assignmentRows, quizRows]
  )

  const summary = useMemo(() => {
    if (combinedGradedRows.length === 0) {
      return {
        avgPercent: 0,
        bestPercent: 0,
        totalSubmissions: assignmentRows.length + quizRows.length,
        overallGrade: 'N/A',
      }
    }

    const percentages = combinedGradedRows.map((row) => row.percentage)
    const avgPercent = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
    const bestPercent = Math.max(...percentages)
    return {
      avgPercent,
      bestPercent,
      totalSubmissions: assignmentRows.length + quizRows.length,
      overallGrade: getLetterGrade(avgPercent),
    }
  }, [assignmentRows.length, combinedGradedRows, quizRows.length])

  const subjectProgress = useMemo(() => {
    const bySubject = new Map<string, { total: number; count: number }>()
    combinedGradedRows.forEach((row) => {
      const prev = bySubject.get(row.subject) ?? { total: 0, count: 0 }
      bySubject.set(row.subject, { total: prev.total + row.percentage, count: prev.count + 1 })
    })
    return Array.from(bySubject.entries()).map(([subject, stats]) => ({
      subject,
      progress: Math.round(stats.total / stats.count),
    }))
  }, [combinedGradedRows])

  const isGradeMatched = returnGrade && student?.grade
    ? normalizeAcademicYear(student.grade) === normalizeAcademicYear(returnGrade)
    : false

  const goBack = () => {
    if (returnGrade) {
      navigate(`/students/class?grade=${normalizeAcademicYear(returnGrade)}`)
      return
    }
    navigate('/students')
  }

  if (!studentId) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm text-red-500">Invalid learner id.</p>
      </GlassCard>
    )
  }

  if (!student && students.length > 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm font-medium text-red-500">Learner not found.</p>
        <button type="button" onClick={goBack} className="btn-ghost mt-4">
          Back
        </button>
      </GlassCard>
    )
  }

  return (
    <div className="relative space-y-5 overflow-hidden">
      <div className="pointer-events-none absolute -left-16 -top-14 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/20" />
      <div className="pointer-events-none absolute -right-20 top-24 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/20" />
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={goBack}
              className="mb-3 inline-flex items-center gap-2 text-sm text-light-ink-muted transition-colors hover:text-light-ink-primary dark:text-dark-ink-muted dark:hover:text-dark-ink-primary"
            >
              <ArrowLeft size={14} />
              Back to {returnGrade ? formatAcademicYearLabel(returnGrade) : 'Cohorts'}
            </button>
            <h1 className="text-2xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Learner Performance Profile</h1>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Complete overview of assignments, quiz attempts, and marks.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-glow">
            {student?.name?.charAt(0).toUpperCase() ?? 'L'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">{student?.name ?? 'Loading...'}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-light-ink-muted dark:text-dark-ink-muted">
              <Mail size={13} />
              {student?.email ?? '...'}
            </p>
            <p className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">
              {student?.grade ? formatAcademicYearLabel(student.grade) : 'Academic year not set'}
              {isGradeMatched ? ' cohort' : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-light-border bg-light-card2/70 px-4 py-3 dark:border-dark-border dark:bg-dark-card2/80">
            <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Joined</p>
            <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">
              {student?.createdAt ? new Date(student.createdAt).toLocaleDateString() : '...'}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div whileHover={{ y: -3 }}>
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Average Score</p>
              <span className="glass-icon h-8 w-8">
                <TrendingUp size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-600">{summary.avgPercent}%</p>
          </GlassCard>
        </motion.div>
        <motion.div whileHover={{ y: -3 }}>
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Best Score</p>
              <span className="glass-icon h-8 w-8">
                <Star size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{summary.bestPercent}%</p>
          </GlassCard>
        </motion.div>
        <motion.div whileHover={{ y: -3 }}>
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Total Submissions</p>
              <span className="glass-icon h-8 w-8">
                <FileCheck size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{summary.totalSubmissions}</p>
          </GlassCard>
        </motion.div>
        <motion.div whileHover={{ y: -3 }}>
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Overall Grade</p>
              <span className="glass-icon h-8 w-8">
                <Trophy size={14} />
              </span>
            </div>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-amber-600">
              {summary.overallGrade}
            </p>
          </GlassCard>
        </motion.div>
      </div>

      {performanceError && (
        <GlassCard className="p-4">
          <p className="text-sm text-red-500">{performanceError}</p>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap size={16} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">Subject-wise Progress</h2>
        </div>
        {loadingPerformance && subjectProgress.length === 0 ? (
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Loading performance...</p>
        ) : subjectProgress.length === 0 ? (
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">No graded records yet.</p>
        ) : (
          <div className="space-y-3">
            {subjectProgress.map((item) => (
              <ProgressBar
                key={item.subject}
                label={item.subject}
                value={item.progress}
                color={item.progress >= 85 ? 'bg-emerald-500' : item.progress >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">Submitted Assignments</h2>
        {assignmentRows.length === 0 ? (
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">No assignment submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-light-border text-left text-xs uppercase tracking-wider text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                  <th className="px-2 py-2">Assignment</th>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Submitted</th>
                  <th className="px-2 py-2">Marks</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignmentRows.map((row) => (
                  <tr key={row.id} className="border-b border-light-border/70 transition-colors hover:bg-indigo-50/50 dark:border-dark-border/70 dark:hover:bg-white/5">
                    <td className="px-2 py-3 font-medium text-light-ink-primary dark:text-dark-ink-primary">{row.title}</td>
                    <td className="px-2 py-3 text-light-ink-secondary dark:text-dark-ink-secondary">{row.subject}</td>
                    <td className="px-2 py-3 text-light-ink-secondary dark:text-dark-ink-secondary">{new Date(row.submittedAt).toLocaleDateString()}</td>
                    <td className="px-2 py-3 text-light-ink-primary dark:text-dark-ink-primary">
                      {row.marks == null ? 'Pending' : `${row.marks}/${row.totalMarks} (${row.percentage}%)`}
                    </td>
                    <td className="px-2 py-3">
                      <Badge
                        label={row.status}
                        variant={row.status === 'graded' ? 'success' : row.status === 'submitted' ? 'info' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">
          <BookOpen size={17} />
          Quiz Attempts
        </h2>
        {quizRows.length === 0 ? (
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">No quiz attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-light-border text-left text-xs uppercase tracking-wider text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                  <th className="px-2 py-2">Quiz</th>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Submitted</th>
                  <th className="px-2 py-2">Marks</th>
                  <th className="px-2 py-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {quizRows.map((row) => (
                  <tr key={row.id} className="border-b border-light-border/70 transition-colors hover:bg-indigo-50/50 dark:border-dark-border/70 dark:hover:bg-white/5">
                    <td className="px-2 py-3 font-medium text-light-ink-primary dark:text-dark-ink-primary">{row.title}</td>
                    <td className="px-2 py-3 text-light-ink-secondary dark:text-dark-ink-secondary">{row.subject}</td>
                    <td className="px-2 py-3 text-light-ink-secondary dark:text-dark-ink-secondary">{new Date(row.submittedAt).toLocaleDateString()}</td>
                    <td className="px-2 py-3 text-light-ink-primary dark:text-dark-ink-primary">{row.marks}/{row.totalMarks} ({row.percentage}%)</td>
                    <td className="px-2 py-3">
                      <Badge
                        label={getLetterGrade(row.percentage)}
                        variant={row.percentage >= 85 ? 'success' : row.percentage >= 60 ? 'info' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {performance?.scoreHistory?.length ? (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">System Score History</h2>
          <div className="space-y-2">
            {performance.scoreHistory.slice(0, 10).map((item) => (
              <div
                key={item.submissionId}
                className="flex flex-col justify-between gap-2 rounded-xl border border-light-border bg-light-card2/70 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-card2/80 md:flex-row md:items-center"
              >
                <div>
                  <p className="font-medium text-light-ink-primary dark:text-dark-ink-primary">{item.assignmentTitle}</p>
                  <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{item.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-600">{item.marks}/{item.totalMarks}</span>
                  <Badge label={`${item.percentage}%`} variant={item.percentage >= 85 ? 'success' : item.percentage >= 60 ? 'info' : 'warning'} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}
