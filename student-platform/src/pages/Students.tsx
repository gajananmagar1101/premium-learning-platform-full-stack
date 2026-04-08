import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Mail, BookOpen, TrendingUp, Award, RefreshCw, Trash2, UserX, Save, FileText } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { useStudentStore } from '@/store/useStudentStore'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useUIStore } from '@/store/useUIStore'
import { studentAPI, scoreAPI } from '@/lib/services'
import type { DBStudent, StudentScore, Assessment } from '@/types'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const avatarColors = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-cyan-600',
]

interface ScoreWithAssessment extends StudentScore {
  assessment: Assessment
}

const getLetterGrade = (percent: number) => {
  if (percent >= 90) return 'A'
  if (percent >= 80) return 'B'
  if (percent >= 70) return 'C'
  if (percent >= 60) return 'D'
  return 'F'
}

function StudentDrawer({ student, onClose }: { student: DBStudent; onClose: () => void }) {
  const { assessments } = useAssessmentStore()
  const { addToast } = useUIStore()
  const [scores, setScores] = useState<ScoreWithAssessment[]>([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [savingScore, setSavingScore] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [scoreValue, setScoreValue] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadScores = useCallback(async () => {
    try {
      const res = await scoreAPI.getStudentScores(student._id)
      const nextScores = res.data.scores ?? []
      setScores(nextScores)
      return nextScores as ScoreWithAssessment[]
    } catch (err) {
      console.error('[StudentDrawer] Failed to fetch scores:', err)
      addToast('Failed to fetch student grades', 'error')
      return []
    } finally {
      setLoadingScores(false)
    }
  }, [addToast, student._id])

  useEffect(() => {
    setLoadingScores(true)
    loadScores()
  }, [loadScores])

  const avg = scores.length
    ? Math.round(scores.reduce((a, s) => {
        const max = s.assessment?.maxScore ?? 100
        return a + (s.score / max) * 100
      }, 0) / scores.length)
    : 0

  const best = scores.length
    ? Math.round(Math.max(...scores.map((s) => (s.score / (s.assessment?.maxScore ?? 100)) * 100)))
    : 0

  // Build subject breakdown from scores
  const subjectMap: Record<string, { total: number; count: number }> = {}
  scores.forEach((s) => {
    const sub = s.assessment?.subject ?? 'Unknown'
    if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0 }
    subjectMap[sub].total += (s.score / (s.assessment?.maxScore ?? 100)) * 100
    subjectMap[sub].count += 1
  })
  const subjects = Object.entries(subjectMap).map(([subject, d]) => ({
    subject,
    progress: Math.round(d.total / d.count),
  }))
  const radarData = subjects.map((s) => ({ subject: s.subject.slice(0, 4), score: s.progress }))
  const availableAssessments = assessments.filter((assessment) => assessment.status !== 'upcoming')

  const selectedAssessment = availableAssessments.find((assessment) => (assessment.id ?? assessment._id) === selectedAssessmentId)
  const existingScore = useMemo(
    () => scores.find((score) => (score.assessment?._id ?? score.assessment?.id ?? score.assessmentId) === selectedAssessmentId),
    [scores, selectedAssessmentId]
  )

  useEffect(() => {
    if (!selectedAssessmentId) {
      setScoreValue('')
      setFeedback('')
      return
    }

    setScoreValue(existingScore ? String(existingScore.score) : '')
    setFeedback(existingScore?.feedback ?? '')
  }, [selectedAssessmentId, existingScore])

  const handleAssignScore = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedAssessmentId) {
      addToast('Select an assessment first', 'error')
      return
    }

    const numericScore = Number(scoreValue)
    if (Number.isNaN(numericScore)) {
      addToast('Enter a valid score', 'error')
      return
    }

    if (numericScore < 0 || numericScore > (selectedAssessment?.maxScore ?? 100)) {
      addToast(`Score must be between 0 and ${selectedAssessment?.maxScore ?? 100}`, 'error')
      return
    }

    setSavingScore(true)
    try {
      await scoreAPI.assign({
        studentId: student._id,
        assessmentId: selectedAssessmentId,
        score: numericScore,
        feedback: feedback.trim(),
      })
      await loadScores()
      addToast(existingScore ? 'Grade updated successfully' : 'Grade assigned successfully', 'success')
    } catch (err) {
      console.error('[StudentDrawer] Failed to save score:', err)
      addToast('Failed to save student grade', 'error')
    } finally {
      setSavingScore(false)
    }
  }

  const handleDeleteScore = async (scoreId: string) => {
    if (!confirm('Delete this student grade?')) return
    try {
      await scoreAPI.delete(scoreId)
      await loadScores()
      addToast('Grade deleted successfully', 'info')
    } catch (err) {
      console.error('[StudentDrawer] Failed to delete score:', err)
      addToast('Failed to delete student grade', 'error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl border-l border-white/20 shadow-2xl z-50 overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Student Profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{student.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} /> {student.email}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">
                {student.grade ? `Grade ${student.grade}` : 'Grade not set'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg Score', value: loadingScores ? '...' : `${avg}%`, icon: TrendingUp, color: 'text-indigo-600' },
              { label: 'Submissions', value: loadingScores ? '...' : scores.length, icon: BookOpen, color: 'text-emerald-600' },
              { label: 'Best Score', value: loadingScores ? '...' : `${best}%`, icon: Award, color: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-white/60 border border-gray-100 text-center">
                <stat.icon size={14} className={`${stat.color} mx-auto mb-1`} />
                <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Joined */}
          <div className="p-3 rounded-xl bg-white/40 border border-gray-100">
            <p className="text-xs text-gray-500">Joined</p>
            <p className="text-sm font-medium text-gray-800">
              {new Date(student.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Radar */}
          {radarData.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/50 border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-2">Skill Radar</p>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject progress */}
          {subjects.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Subject Progress</p>
              {subjects.map((sub) => (
                <ProgressBar key={sub.subject} label={sub.subject} value={sub.progress}
                  color={sub.progress >= 85 ? 'bg-emerald-500' : sub.progress >= 70 ? 'bg-indigo-500' : 'bg-amber-500'} />
              ))}
            </div>
          )}

          {/* Score history */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Score History</p>
            {loadingScores ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No scores yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scores.map((sc) => {
                  const pct = Math.round((sc.score / (sc.assessment?.maxScore ?? 100)) * 100)
                  return (
                    <div key={sc._id ?? sc.assessmentId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 border border-gray-100">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{sc.assessment?.title ?? 'Assessment'}</p>
                        <p className="text-xs text-gray-400">{sc.assessment?.subject} · {new Date(sc.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-indigo-600">{sc.score}/{sc.assessment?.maxScore ?? 100}</span>
                        <Badge label={`${pct}%`} variant={pct >= 85 ? 'success' : pct >= 60 ? 'info' : 'warning'} />
                        <Badge label={getLetterGrade(pct)} variant={pct >= 85 ? 'success' : pct >= 60 ? 'info' : 'warning'} />
                        {sc._id && (
                          <button
                            onClick={() => handleDeleteScore(sc._id!)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                            title="Delete grade"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-900">Assign Subject-wise Grade</p>
            </div>

            <form onSubmit={handleAssignScore} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Assessment</label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Select assessment</option>
                  {availableAssessments.map((assessment) => (
                    <option key={assessment.id ?? assessment._id} value={assessment.id ?? assessment._id}>
                      {assessment.subject} · {assessment.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Score</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedAssessment?.maxScore ?? 100}
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder={selectedAssessment ? `0-${selectedAssessment.maxScore}` : 'Enter score'}
                  />
                </div>
                <div className="p-3 rounded-xl bg-white/60 border border-gray-100">
                  <p className="text-xs text-gray-500">Grade Preview</p>
                  <p className="text-base font-bold text-indigo-600 mt-1">
                    {scoreValue && selectedAssessment
                      ? getLetterGrade(Math.round((Number(scoreValue) / selectedAssessment.maxScore) * 100))
                      : '--'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Max: {selectedAssessment?.maxScore ?? '--'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                  placeholder="Optional teacher feedback"
                />
              </div>

              <button
                type="submit"
                disabled={savingScore}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-60"
              >
                <Save size={14} />
                {savingScore ? 'Saving...' : existingScore ? 'Update Grade' : 'Assign Grade'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export function Students() {
  const { students, loading, error, fetchStudents, removeStudent } = useStudentStore()
  const { addToast } = useUIStore()
  const [selected, setSelected] = useState<DBStudent | null>(null)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All')

  // ✅ FIX: Fetch real students from API on mount
  useEffect(() => {
    console.log('[Students] Fetching students from API...')
    fetchStudents()
  }, [fetchStudents])

  const grades = ['All', ...Array.from(new Set(students.map((s) => s.grade).filter(Boolean)))]

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === 'All' || s.grade === gradeFilter
    return matchSearch && matchGrade
  })

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this student and all their scores?')) return
    try {
      await studentAPI.delete(id)
      removeStudent(id)
      addToast('Student deleted successfully', 'info')
      if (selected?._id === id) setSelected(null)
    } catch {
      addToast('Failed to delete student', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <UserX size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-sm font-medium text-red-600 mb-1">Failed to load students</p>
        <p className="text-xs text-gray-500 mb-4">{error}</p>
        <button onClick={fetchStudents}
          className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-xl hover:bg-indigo-600 transition-colors">
          Retry
        </button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white/60 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-44" />
          </div>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white/60 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
            {grades.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{filtered.length} students</p>
          <button onClick={fetchStudents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-sm text-gray-600 hover:bg-white/80 transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <GlassCard className="p-12 text-center">
          <UserX size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {students.length === 0 ? 'No students registered yet' : 'No students match your search'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {students.length === 0 ? 'Students will appear here once they sign up' : 'Try a different search or filter'}
          </p>
        </GlassCard>
      )}

      {/* Student cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((student, i) => (
          <motion.div key={student._id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard hover className="p-5 cursor-pointer" onClick={() => setSelected(student)}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0`}>
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {student.grade
                      ? <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Grade {student.grade}</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No grade</span>
                    }
                    <span className="text-xs text-gray-400">
                      Joined {new Date(student.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDelete(student._id, e)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title="Delete student"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-indigo-500 mt-3 font-medium">Click to view scores & details →</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
