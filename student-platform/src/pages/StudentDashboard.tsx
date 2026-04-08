import { useEffect, useState } from 'react'
import { TrendingUp, Calendar, AlertCircle, CheckCircle2, Flame, Star, Zap, Target } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/useAuthStore'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { scoreAPI } from '@/lib/services'
import { performanceData } from '@/data/mockData'
import type { StudentScore, Assessment } from '@/types'

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

const suggestions = [
  { area: 'Science', tip: 'Focus on lab report writing and data analysis', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  { area: 'Mathematics', tip: 'Practice calculus problems daily', icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { area: 'History', tip: 'Review timeline of World War events', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
]

const achievements = [
  { icon: Flame, label: '7-Day Streak', desc: 'Logged in 7 days in a row', earned: true, color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: Star, label: 'Top Scorer', desc: 'Scored 90%+ on an assessment', earned: true, color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Zap, label: 'Fast Learner', desc: 'Completed 3 assessments this week', earned: true, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { icon: Target, label: 'Perfect Score', desc: 'Score 100% on any assessment', earned: false, color: 'text-gray-400', bg: 'bg-gray-50' },
]

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user)
  const assessments = useAssessmentStore((state) => state.assessments)
  const [scores, setScores] = useState<ScoreWithAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const userId = user?._id ?? user?.id

  if (import.meta.env.DEV) {
    console.count('[Render] StudentDashboard')
    console.log('[StudentDashboard] active user id:', userId)
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchScores = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[StudentDashboard] fetching scores once for:', userId)
        }

        const res = await scoreAPI.getStudentScores(userId)
        if (!cancelled) {
          setScores(res.data.scores ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[StudentDashboard] Failed to fetch scores:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchScores()

    return () => {
      cancelled = true
    }
  }, [userId])

  const upcoming = assessments.filter((a) => a.status === 'upcoming').slice(0, 3)

  const avg = scores.length
    ? Math.round(scores.reduce((a, s) => a + (s.score / (s.assessment?.maxScore ?? 100)) * 100, 0) / scores.length)
    : 0

  const best = scores.length
    ? Math.round(Math.max(...scores.map((s) => (s.score / (s.assessment?.maxScore ?? 100)) * 100)))
    : 0

  // Build subject breakdown
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
  const subjectGrades = Object.entries(subjectMap)
    .map(([subject, d]) => {
      const percent = Math.round(d.total / d.count)
      return {
        subject,
        percent,
        grade: getLetterGrade(percent),
      }
    })
    .sort((a, b) => a.subject.localeCompare(b.subject))

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <GlassCard className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border-indigo-200/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome back, {user?.name.split(' ')[0]}! 👋</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Your average score this term is <span className="font-semibold text-indigo-600">{loading ? '...' : `${avg}%`}</span>
              {avg >= 85 && <span className="ml-2 text-emerald-600 font-medium">· Excellent work! 🎉</span>}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : `${avg}%`}</p>
              <p className="text-xs text-gray-500">Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{loading ? '...' : `${best}%`}</p>
              <p className="text-xs text-gray-500">Best Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{loading ? '...' : scores.length}</p>
              <p className="text-xs text-gray-500">Submitted</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Achievements */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Achievements</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a, i) => (
            <motion.div key={a.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}>
              <GlassCard hover className={`p-4 text-center ${!a.earned ? 'opacity-50 grayscale' : ''}`}>
                <div className={`inline-flex p-2.5 rounded-xl ${a.bg} mb-2`}>
                  <a.icon size={20} className={a.color} />
                </div>
                <p className="text-xs font-semibold text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                {a.earned && <span className="inline-block mt-1.5 text-xs text-emerald-600 font-medium">✓ Earned</span>}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Subject Progress */}
        <GlassCard className="p-5 xl:col-span-1">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Subject Progress</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-6 rounded bg-gray-100 animate-pulse" />)}</div>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No scores yet</p>
          ) : (
            <div className="space-y-4">
              {subjects.map((sub) => (
                <ProgressBar key={sub.subject} label={sub.subject} value={sub.progress}
                  color={sub.progress >= 85 ? 'bg-emerald-500' : sub.progress >= 70 ? 'bg-indigo-500' : 'bg-amber-500'} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Performance Chart */}
        <GlassCard className="p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[60, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4, fill: '#4F46E5' }} name="Your Score" />
              <Line type="monotone" dataKey="average" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Class Avg" />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Skill Radar */}
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Skill Overview</h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <Radar dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Complete assessments to see your skill radar</p>
          )}
        </GlassCard>

        {/* Upcoming Assessments */}
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" /> Upcoming Assessments
          </h2>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No upcoming assessments</p>
            ) : upcoming.map((a) => (
              <div key={a.id ?? a._id} className="flex items-center justify-between p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.subject} · {a.date}</p>
                </div>
                <Badge label="Upcoming" variant="info" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Subject-wise Grades</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        ) : subjectGrades.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No subject grades available yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Subject', 'Average', 'Grade'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectGrades.map((item, i) => (
                  <motion.tr key={item.subject} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="border-b border-gray-50 hover:bg-white/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900">{item.subject}</td>
                    <td className="py-3 px-3 text-indigo-600 font-semibold">{item.percent}%</td>
                    <td className="py-3 px-3">
                      <Badge
                        label={item.grade}
                        variant={item.percent >= 85 ? 'success' : item.percent >= 60 ? 'info' : 'warning'}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Score History */}
      <GlassCard className="p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Score History</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        ) : scores.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No scores recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Assessment', 'Score', 'Grade', 'Submitted'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map((sc, i) => {
                  const pct = Math.round((sc.score / (sc.assessment?.maxScore ?? 100)) * 100)
                  return (
                    <motion.tr key={sc._id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="border-b border-gray-50 hover:bg-white/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">{sc.assessment?.title ?? 'Assessment'}</td>
                      <td className="py-3 px-3 font-bold text-indigo-600">{sc.score} / {sc.assessment?.maxScore ?? 100}</td>
                      <td className="py-3 px-3">
                        <Badge label={`${pct}%`} variant={pct >= 85 ? 'success' : pct >= 60 ? 'info' : 'warning'} />
                      </td>
                      <td className="py-3 px-3 text-gray-500">{new Date(sc.submittedAt).toLocaleDateString()}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Improvement Suggestions */}
      <GlassCard className="p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Improvement Suggestions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {suggestions.map((s, i) => (
            <motion.div key={s.area} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`p-4 rounded-xl ${s.bg} hover:shadow-md transition-all`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} className={s.color} />
                <p className="text-sm font-semibold text-gray-900">{s.area}</p>
              </div>
              <p className="text-xs text-gray-500">{s.tip}</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
