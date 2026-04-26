import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAuthStore } from '@/store/useAuthStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { useQuizStore } from '@/store/useQuizStore'
import { useUIStore } from '@/store/useUIStore'
import { studentAPI } from '@/lib/services'
import { formatAcademicYearLabel } from '@/lib/btech'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { StudentPerformance } from '@/types'
import { Mail, Shield, User, Edit2, Check, Moon, Sun, Bell, X, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'

export function Profile() {
  const { user, setUser } = useAuthStore()
  const { students } = useStudentStore()
  const { studentAssignments, fetchStudentAssignments } = useAssignmentStore()
  const { quizzes, attempts, fetchQuizzes, fetchAttempts } = useQuizStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [className, setClassName] = useState(user?.grade ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [performance, setPerformance] = useState<StudentPerformance | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToast } = useUIStore()

  const student = user?.role === 'student' ? students.find((s) => s._id === (user._id ?? user.id)) : null

  useEffect(() => {
    const studentId = user?._id ?? user?.id
    if (user?.role !== 'student' || !studentId) return

    let cancelled = false
    const loadPerformance = async () => {
      try {
        const res = await studentAPI.getPerformance(studentId)
        if (!cancelled) {
          setPerformance(res.data.performance ?? null)
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (!cancelled) {
          setPerformance(null)
          if (status && status !== 404) {
            console.error('[Profile] Failed to load performance:', error)
          }
        }
      }
    }

    loadPerformance()
    const intervalId = window.setInterval(loadPerformance, 15000)
    const handleFocus = () => {
      loadPerformance()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?._id, user?.id, user?.role])

  useEffect(() => {
    if (user?.role !== 'student') return
    fetchStudentAssignments()
  }, [fetchStudentAssignments, user?.role])

  useEffect(() => {
    if (user?.role !== 'student') return
    fetchQuizzes()
    fetchAttempts()
  }, [fetchAttempts, fetchQuizzes, user?.role])

  const gradedAssignments = studentAssignments
    .filter((assignment) => assignment.submission?.marks != null)
    .map((assignment) => {
      const marks = assignment.submission?.marks ?? 0
      const totalMarks = assignment.totalMarks || 100
      return {
        submissionId: `assignment-${assignment.submission?.id ?? assignment.id}`,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        subject: assignment.subject,
        marks,
        totalMarks,
        percentage: Math.round((marks / totalMarks) * 100),
        gradedAt: assignment.submission?.updatedAt ?? assignment.deadline,
      }
    })

  const studentId = user?._id ?? user?.id
  const gradedQuizAttempts = attempts
    .filter((attempt) => studentId && attempt.studentId === studentId)
    .map((attempt) => {
      const quiz = quizzes.find((item) => item.id === attempt.quizId)
      const totalMarks = attempt.totalPoints || 1
      return {
        submissionId: `quiz-${attempt.id}`,
        assignmentId: attempt.quizId,
        assignmentTitle: quiz?.title ? `[Quiz] ${quiz.title}` : '[Quiz] Quiz Attempt',
        subject: quiz?.subject ?? 'Quiz',
        marks: attempt.score,
        totalMarks,
        percentage: Math.round((attempt.score / totalMarks) * 100),
        gradedAt: attempt.submittedAt,
      }
    })

  const allGradedItems = [...gradedAssignments, ...gradedQuizAttempts]
    .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())

  const gradedPercentages = allGradedItems.map((item) => item.percentage)
  const localAvgPercentage = gradedPercentages.length
    ? Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length)
    : 0
  const localBestPercentage = gradedPercentages.length
    ? Math.max(...gradedPercentages)
    : 0
  const localAvgScore = allGradedItems.length
    ? Math.round((allGradedItems.reduce((sum, item) => sum + item.marks, 0) / allGradedItems.length) * 100) / 100
    : 0
  const localBestScore = allGradedItems.length
    ? Math.max(...allGradedItems.map((item) => item.marks))
    : 0
  const localProgress = localAvgPercentage
  const localGrade = localAvgPercentage >= 90 ? 'A' : localAvgPercentage >= 80 ? 'B' : localAvgPercentage >= 70 ? 'C' : localAvgPercentage >= 60 ? 'D' : allGradedItems.length ? 'F' : 'N/A'
  const derivedPerformance = allGradedItems.length ? {
    avgScore: localAvgScore,
    avgPercentage: localAvgPercentage,
    bestScore: localBestScore,
    bestPercentage: localBestPercentage,
    overallGrade: localGrade,
    progressPercent: localProgress,
    totalSubmissions: allGradedItems.length,
    scoreHistory: allGradedItems,
  } : null
  const displayPerformance = derivedPerformance ?? performance

  useEffect(() => {
    setDisplayName(user?.name ?? '')
    setClassName(user?.grade ?? '')
  }, [user?.email, user?.grade, user?.name])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode !== 'edit' || !user) return

    setEditing(true)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('mode')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, user])

  const handleSave = async () => {
    if (!user) return

    setSavingProfile(true)
    try {
      const res = await studentAPI.updateMe({
        name: displayName.trim(),
        email: user.email,
        grade: user.role === 'student' ? className.trim() : undefined,
      })
      setUser(res.data.user)
      setEditing(false)
      addToast('Profile updated successfully', 'success')
    } catch (error) {
      console.error('[Profile] Failed to update profile:', error)
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? (error.request ? 'Cannot reach backend. Restart the active backend and try again.' : error.message)
        : 'Failed to update profile'
      addToast(message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    setDisplayName(user?.name ?? '')
    setClassName(user?.grade ?? '')
    setEditing(false)
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Profile Header */}
      <GlassCard className="p-6">
        <div className="flex items-start gap-5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-500/30 shrink-0"
          >
            {user?.name.charAt(0)}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">{displayName}</h2>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg p-1.5 text-light-ink-muted transition-colors hover:bg-indigo-500/10 hover:text-indigo-600 dark:text-dark-ink-muted dark:hover:text-indigo-300"
              >
                <Edit2 size={15} />
              </button>
            </div>
            <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">{user?.email}</p>
            <span className="mt-2 inline-block rounded-full bg-indigo-500/12 px-3 py-1 text-xs font-semibold capitalize text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              {user?.role === 'admin' ? '👨‍🏫 Program Admin' : '🎓 B.Tech Learner'}
            </span>
          </div>
        </div>

        {/* Learner stats */}
        {student && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Avg Score', value: displayPerformance ? `${displayPerformance.avgScore}` : '0', color: 'text-indigo-600' },
              { label: 'Best Score', value: displayPerformance ? `${displayPerformance.bestScore}` : '0', color: 'text-emerald-600' },
              { label: 'Grade', value: displayPerformance?.overallGrade ?? 'N/A', color: 'text-purple-600' },
              { label: 'Submissions', value: displayPerformance ? `${displayPerformance.totalSubmissions}` : '0', color: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-light-card2/70 p-3 text-center dark:bg-dark-card2/80">
                <p className={`text-base font-bold ${stat.color} truncate`}>{stat.value}</p>
                <p className="mt-0.5 text-xs text-light-ink-muted dark:text-dark-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {user?.role === 'student' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Performance Progress</h3>
              <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">Updates automatically when admin posts grades.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">{displayPerformance?.overallGrade ?? 'N/A'}</p>
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Overall Grade</p>
            </div>
          </div>
          <ProgressBar
            label="Overall Progress"
            value={displayPerformance?.progressPercent ?? 0}
            color={(displayPerformance?.progressPercent ?? 0) >= 85 ? 'bg-emerald-500' : (displayPerformance?.progressPercent ?? 0) >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Average Percentage</p>
              <p className="mt-1 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{displayPerformance?.avgPercentage ?? 0}%</p>
            </div>
            <div className="rounded-xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Best Percentage</p>
              <p className="mt-1 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{displayPerformance?.bestPercentage ?? 0}%</p>
            </div>
          </div>
        </GlassCard>
      )}

      {user?.role === 'student' && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Score History</h3>
          {!displayPerformance?.scoreHistory?.length ? (
            <p className="py-6 text-center text-sm text-light-ink-muted dark:text-dark-ink-muted">No graded assignments yet.</p>
          ) : (
            <div className="space-y-3">
              {displayPerformance.scoreHistory.map((item) => (
                <div
                  key={item.submissionId}
                  className="flex items-center justify-between gap-4 rounded-xl bg-light-card2/60 p-3 transition-colors hover:bg-light-hover dark:bg-dark-card2/70 dark:hover:bg-dark-hover"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{item.assignmentTitle}</p>
                    <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{item.subject} · {new Date(item.gradedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-indigo-600">{item.marks}/{item.totalMarks}</p>
                    <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Info Fields */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Account Information</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <Edit2 size={13} /> Edit Info
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-light-card2 px-3 py-1.5 text-xs font-semibold text-light-ink-secondary transition-colors hover:bg-light-hover dark:bg-dark-card2 dark:text-dark-ink-secondary dark:hover:bg-dark-hover"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-60"
              >
                <Check size={13} /> {savingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-light-card2/60 p-3 transition-colors hover:bg-light-hover dark:bg-dark-card2/70 dark:hover:bg-dark-hover">
            <div className="glass-icon bg-indigo-500/10">
              <User size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Full Name</p>
              {editing ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-indigo-200 bg-white/85 px-3 py-2 text-sm font-medium text-light-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-dark-border dark:bg-dark-base dark:text-dark-ink-primary"
                />
              ) : (
                <p className="text-sm font-medium capitalize text-light-ink-primary dark:text-dark-ink-primary">{displayName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-light-card2/60 p-3 transition-colors hover:bg-light-hover dark:bg-dark-card2/70 dark:hover:bg-dark-hover">
            <div className="glass-icon bg-indigo-500/10">
              <Mail size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Email Address</p>
              <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{user?.email}</p>
            </div>
          </div>

          {user?.role === 'student' && (
            <div className="flex items-center gap-3 rounded-xl bg-light-card2/60 p-3 transition-colors hover:bg-light-hover dark:bg-dark-card2/70 dark:hover:bg-dark-hover">
              <div className="glass-icon bg-indigo-500/10">
                <GraduationCap size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Academic Year</p>
                {editing ? (
                  <input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-indigo-200 bg-white/85 px-3 py-2 text-sm font-medium text-light-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-dark-border dark:bg-dark-base dark:text-dark-ink-primary"
                    placeholder="Enter B.Tech year"
                  />
                ) : (
                  <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{user?.grade ? formatAcademicYearLabel(user.grade) : 'Academic year not set'}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl bg-light-card2/60 p-3 transition-colors hover:bg-light-hover dark:bg-dark-card2/70 dark:hover:bg-dark-hover">
            <div className="glass-icon bg-indigo-500/10">
              <Shield size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Role</p>
              <p className="text-sm font-medium capitalize text-light-ink-primary dark:text-dark-ink-primary">{user?.role === 'admin' ? 'Administrator / Faculty' : 'B.Tech Learner'}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Preferences */}
      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-light-card2/60 p-3 dark:bg-dark-card2/70">
            <div className="flex items-center gap-3">
              <div className="glass-icon bg-light-card dark:bg-dark-card2">
                {darkMode ? <Moon size={16} className="text-indigo-600" /> : <Sun size={16} className="text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">Dark Mode</p>
                <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Toggle dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-light-card2/60 p-3 dark:bg-dark-card2/70">
            <div className="flex items-center gap-3">
              <div className="glass-icon bg-indigo-500/10">
                <Bell size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">Notifications</p>
                <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Assessment reminders & updates</p>
              </div>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-indigo-500">
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow translate-x-5" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
