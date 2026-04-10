import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAuthStore } from '@/store/useAuthStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { useUIStore } from '@/store/useUIStore'
import { studentAPI } from '@/lib/services'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { StudentPerformance } from '@/types'
import { Mail, Shield, User, Edit2, Check, Moon, Sun, Bell, X, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'

export function Profile() {
  const { user, setUser } = useAuthStore()
  const { students } = useStudentStore()
  const { studentAssignments, fetchStudentAssignments } = useAssignmentStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [className, setClassName] = useState(user?.grade ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [performance, setPerformance] = useState<StudentPerformance | null>(null)
  const { addToast, addNotification } = useUIStore()

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

  const gradedAssignments = studentAssignments
    .filter((assignment) => assignment.submission?.marks != null)
    .map((assignment) => {
      const marks = assignment.submission?.marks ?? 0
      const totalMarks = assignment.totalMarks || 100
      return {
        submissionId: assignment.submission?.id ?? assignment.id,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        subject: assignment.subject,
        marks,
        totalMarks,
        percentage: Math.round((marks / totalMarks) * 100),
        gradedAt: assignment.submission?.updatedAt ?? assignment.deadline,
      }
    })

  const gradedPercentages = gradedAssignments.map((item) => item.percentage)
  const localAvgPercentage = gradedPercentages.length
    ? Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length)
    : 0
  const localBestPercentage = gradedPercentages.length
    ? Math.max(...gradedPercentages)
    : 0
  const localAvgScore = gradedAssignments.length
    ? Math.round((gradedAssignments.reduce((sum, item) => sum + item.marks, 0) / gradedAssignments.length) * 100) / 100
    : 0
  const localBestScore = gradedAssignments.length
    ? Math.max(...gradedAssignments.map((item) => item.marks))
    : 0
  const localProgress = localAvgPercentage
  const localGrade = localAvgPercentage >= 90 ? 'A' : localAvgPercentage >= 80 ? 'B' : localAvgPercentage >= 70 ? 'C' : localAvgPercentage >= 60 ? 'D' : gradedAssignments.length ? 'F' : 'N/A'
  const derivedPerformance = gradedAssignments.length ? {
    avgScore: localAvgScore,
    avgPercentage: localAvgPercentage,
    bestScore: localBestScore,
    bestPercentage: localBestPercentage,
    overallGrade: localGrade,
    progressPercent: localProgress,
    totalSubmissions: gradedAssignments.length,
    scoreHistory: gradedAssignments,
  } : null
  const displayPerformance = derivedPerformance ?? performance

  useEffect(() => {
    setDisplayName(user?.name ?? '')
    setClassName(user?.grade ?? '')
  }, [user?.email, user?.grade, user?.name])

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
      addNotification({
        title: 'Profile updated',
        message: 'Your account information was saved successfully.',
        type: 'success',
      })
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
              <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-600"
              >
                <Edit2 size={15} />
              </button>
            </div>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold capitalize">
              {user?.role === 'admin' ? '👨‍🏫 Administrator' : '🎓 Student'}
            </span>
          </div>
        </div>

        {/* Student stats */}
        {student && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Avg Score', value: displayPerformance ? `${displayPerformance.avgScore}` : '0', color: 'text-indigo-600' },
              { label: 'Best Score', value: displayPerformance ? `${displayPerformance.bestScore}` : '0', color: 'text-emerald-600' },
              { label: 'Grade', value: displayPerformance?.overallGrade ?? 'N/A', color: 'text-purple-600' },
              { label: 'Submissions', value: displayPerformance ? `${displayPerformance.totalSubmissions}` : '0', color: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-white/40">
                <p className={`text-base font-bold ${stat.color} truncate`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {user?.role === 'student' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Performance Progress</h3>
              <p className="text-xs text-gray-500 mt-1">Updates automatically when admin posts grades.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">{displayPerformance?.overallGrade ?? 'N/A'}</p>
              <p className="text-xs text-gray-500">Overall Grade</p>
            </div>
          </div>
          <ProgressBar
            label="Overall Progress"
            value={displayPerformance?.progressPercent ?? 0}
            color={(displayPerformance?.progressPercent ?? 0) >= 85 ? 'bg-emerald-500' : (displayPerformance?.progressPercent ?? 0) >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-white/30 p-3">
              <p className="text-xs text-gray-500">Average Percentage</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{displayPerformance?.avgPercentage ?? 0}%</p>
            </div>
            <div className="rounded-xl bg-white/30 p-3">
              <p className="text-xs text-gray-500">Best Percentage</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{displayPerformance?.bestPercentage ?? 0}%</p>
            </div>
          </div>
        </GlassCard>
      )}

      {user?.role === 'student' && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Score History</h3>
          {!displayPerformance?.scoreHistory?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No graded assignments yet.</p>
          ) : (
            <div className="space-y-3">
              {displayPerformance.scoreHistory.map((item) => (
                <div key={item.submissionId} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.assignmentTitle}</p>
                    <p className="text-xs text-gray-500">{item.subject} · {new Date(item.gradedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-indigo-600">{item.marks}/{item.totalMarks}</p>
                    <p className="text-xs text-gray-500">{item.percentage}%</p>
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
          <h3 className="text-sm font-semibold text-gray-900">Account Information</h3>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
            <div className="glass-icon bg-indigo-500/10">
              <User size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Full Name</p>
              {editing ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full text-sm font-medium text-gray-900 bg-white/80 border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900 capitalize">{displayName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
            <div className="glass-icon bg-indigo-500/10">
              <Mail size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email Address</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          {user?.role === 'student' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
              <div className="glass-icon bg-indigo-500/10">
                <GraduationCap size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Class</p>
                {editing ? (
                  <input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="mt-1 w-full text-sm font-medium text-gray-900 bg-white/80 border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="Enter class"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">{user?.grade ? `Class ${user.grade}` : 'Class not set'}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
            <div className="glass-icon bg-indigo-500/10">
              <Shield size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.role === 'admin' ? 'Administrator / Teacher' : 'Student'}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Preferences */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/30">
            <div className="flex items-center gap-3">
              <div className="glass-icon bg-gray-100">
                {darkMode ? <Moon size={16} className="text-indigo-600" /> : <Sun size={16} className="text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Dark Mode</p>
                <p className="text-xs text-gray-500">Toggle dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/30">
            <div className="flex items-center gap-3">
              <div className="glass-icon bg-indigo-500/10">
                <Bell size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">Assessment reminders & updates</p>
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
