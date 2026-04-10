import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/useAuthStore'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { scoreAPI, studentAPI } from '@/lib/services'
import type { Assessment, StudentPerformance, StudentScore } from '@/types'

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

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user)
  const assessments = useAssessmentStore((state) => state.assessments)
  const { studentAssignments, fetchStudentAssignments } = useAssignmentStore()
  const [scores, setScores] = useState<ScoreWithAssessment[]>([])
  const [performance, setPerformance] = useState<StudentPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const userId = user?._id ?? user?.id

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const scoresRes = await scoreAPI.getStudentScores(userId)
        if (!cancelled) {
          setScores(scoresRes.data.scores ?? [])
        }

        try {
          const performanceRes = await studentAPI.getPerformance(userId)
          if (!cancelled) {
            setPerformance(performanceRes.data.performance ?? null)
          }
        } catch (performanceError) {
          const status = (performanceError as { response?: { status?: number } })?.response?.status
          if (!cancelled) {
            setPerformance(null)
            if (status && status !== 404) {
              console.error('[StudentDashboard] Failed to load performance:', performanceError)
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[StudentDashboard] Failed to load scores:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    const intervalId = window.setInterval(load, 15000)
    const handleFocus = () => {
      load()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchStudentAssignments()
    const intervalId = window.setInterval(fetchStudentAssignments, 15000)
    const handleFocus = () => {
      fetchStudentAssignments()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchStudentAssignments, userId])

  const gradedAssignments = studentAssignments
    .filter((assignment) => assignment.submission?.marks != null)
    .map((assignment) => {
      const marks = assignment.submission?.marks ?? 0
      const totalMarks = assignment.totalMarks || 100
      return {
        submissionId: assignment.submission?.id ?? assignment.id,
        assignmentTitle: assignment.title,
        subject: assignment.subject,
        marks,
        totalMarks,
        percentage: Math.round((marks / totalMarks) * 100),
        gradedAt: assignment.submission?.updatedAt ?? assignment.deadline,
      }
    })

  const gradedPercentages = gradedAssignments.map((item) => item.percentage)
  const derivedPerformance = gradedAssignments.length ? {
    avgScore: Math.round((gradedAssignments.reduce((sum, item) => sum + item.marks, 0) / gradedAssignments.length) * 100) / 100,
    avgPercentage: Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length),
    bestScore: Math.max(...gradedAssignments.map((item) => item.marks)),
    bestPercentage: Math.max(...gradedPercentages),
    overallGrade: Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length) >= 90
      ? 'A'
      : Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length) >= 80
        ? 'B'
        : Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length) >= 70
          ? 'C'
          : Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length) >= 60
            ? 'D'
            : 'F',
    progressPercent: Math.round(gradedPercentages.reduce((sum, value) => sum + value, 0) / gradedPercentages.length),
    totalSubmissions: gradedAssignments.length,
    scoreHistory: gradedAssignments,
  } : null

  const displayPerformance = derivedPerformance ?? performance

  const averageScore = Math.round(displayPerformance?.avgPercentage ?? displayPerformance?.avgScore ?? 0)

  const bestScore = displayPerformance?.bestPercentage ?? displayPerformance?.bestScore ?? 0

  const subjectProgress = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>()
    if (gradedAssignments.length) {
      gradedAssignments.forEach((assignment) => {
        const subject = assignment.subject ?? 'Unknown'
        const current = totals.get(subject) ?? { total: 0, count: 0 }
        current.total += assignment.percentage
        current.count += 1
        totals.set(subject, current)
      })
    } else {
      scores.forEach((score) => {
        const subject = score.assessment?.subject ?? 'Unknown'
        const current = totals.get(subject) ?? { total: 0, count: 0 }
        current.total += (score.score / (score.assessment?.maxScore ?? 100)) * 100
        current.count += 1
        totals.set(subject, current)
      })
    }
    return Array.from(totals.entries()).map(([subject, value]) => ({
      subject,
      progress: Math.round(value.total / value.count),
    }))
  }, [gradedAssignments, scores])

  const trendData = useMemo(() => (
    gradedAssignments.length
      ? [...gradedAssignments]
          .reverse()
          .map((assignment) => ({
            name: assignment.assignmentTitle.slice(0, 16) ?? 'Assignment',
            score: assignment.percentage,
          }))
      : [...scores]
          .reverse()
          .map((score) => ({
            name: score.assessment?.title?.slice(0, 16) ?? 'Assessment',
            score: Math.round((score.score / (score.assessment?.maxScore ?? 100)) * 100),
          }))
  ), [gradedAssignments, scores])

  const upcomingAssessments = assessments.filter((assessment) => assessment.status === 'upcoming').slice(0, 4)

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border-indigo-200/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome back, {user?.name.split(' ')[0]}!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track your real scores, pending work, and upcoming deadlines from one place.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : `${averageScore}%`}</p>
              <p className="text-xs text-gray-500">Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{loading ? '...' : `${bestScore}%`}</p>
              <p className="text-xs text-gray-500">Best</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{loading ? '...' : displayPerformance?.totalSubmissions ?? 0}</p>
              <p className="text-xs text-gray-500">Graded</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Subject Progress</h2>
          {!subjectProgress.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No subject data yet.</p>
          ) : (
            <div className="space-y-4">
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

        <GlassCard className="p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Performance Trend</h2>
          {!trendData.length ? (
            <p className="text-sm text-gray-400 text-center py-12">No completed assessments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4, fill: '#4F46E5' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Skill Overview</h2>
          {!subjectProgress.length ? (
            <p className="text-sm text-gray-400 text-center py-12">Complete assessments to unlock the radar chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={subjectProgress.map((item) => ({ subject: item.subject.slice(0, 6), score: item.progress }))}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <Radar dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" /> Upcoming Assessments
          </h2>
          {!upcomingAssessments.length ? (
            <p className="text-sm text-gray-400 text-center py-12">No upcoming assessments right now.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssessments.map((assessment) => (
                <div key={assessment.id ?? assessment._id} className="flex items-center justify-between p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{assessment.title}</p>
                    <p className="text-xs text-gray-500">{assessment.subject} · {assessment.date}</p>
                  </div>
                  <Badge label="Upcoming" variant="info" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" /> Graded Assessments
        </h2>
        {!displayPerformance?.scoreHistory?.length ? (
          <p className="text-sm text-gray-400 text-center py-12">No grades published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Assessment', 'Subject', 'Score', 'Grade', 'Updated'].map((heading) => (
                    <th key={heading} className="text-left py-2 px-3 text-gray-500 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayPerformance.scoreHistory.map((item) => {
                  const percent = Math.round((item.marks / (item.totalMarks || 100)) * 100)
                  return (
                    <tr key={item.submissionId} className="border-b border-gray-50">
                      <td className="py-3 px-3 text-gray-900 font-medium">{item.assignmentTitle}</td>
                      <td className="py-3 px-3 text-gray-600">{item.subject}</td>
                      <td className="py-3 px-3 text-gray-600">{item.marks}/{item.totalMarks}</td>
                      <td className="py-3 px-3 text-gray-600">{getLetterGrade(percent)}</td>
                      <td className="py-3 px-3 text-gray-600">{new Date(item.gradedAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
