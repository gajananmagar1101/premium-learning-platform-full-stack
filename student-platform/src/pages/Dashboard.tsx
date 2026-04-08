import { useEffect, useRef, useState } from 'react'
import { Users, TrendingUp, CheckCircle, BookOpen, Trophy, Activity, ArrowUpRight, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useStudentStore } from '@/store/useStudentStore'
import { scoreAPI } from '@/lib/services'
import { performanceData, assessmentComparisonData } from '@/data/mockData'

interface Analytics {
  totalStudents: number
  totalAssessments: number
  avgScore: number
  subjectAverages: { subject: string; classAvg: number; topScore: number }[]
  leaderboard: { id: string; name: string; grade: string; avg: number }[]
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    let start = 0
    const step = Math.max(1, Math.ceil(value / 30))
    ref.current = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(ref.current!) }
      else setDisplay(start)
    }, 30)
    return () => clearInterval(ref.current!)
  }, [value])
  return <>{display}</>
}

const activityFeed = [
  { id: 1, user: 'Alice Johnson', action: 'submitted', target: 'Algebra Midterm', time: '2m ago', color: 'bg-emerald-500' },
  { id: 2, user: 'Bob Martinez', action: 'started', target: 'Essay Writing', time: '15m ago', color: 'bg-indigo-500' },
  { id: 3, user: 'Carol White', action: 'scored 95% on', target: 'Physics Lab', time: '1h ago', color: 'bg-purple-500' },
  { id: 4, user: 'David Lee', action: 'submitted', target: 'World History Quiz', time: '2h ago', color: 'bg-amber-500' },
  { id: 5, user: 'Emma Davis', action: 'completed', target: 'Literature Review', time: '3h ago', color: 'bg-pink-500' },
]

const statusVariant = (s: string) =>
  s === 'completed' ? 'success' : s === 'upcoming' ? 'info' : 'warning'

const medalColors = ['text-amber-500', 'text-gray-400', 'text-orange-600']
const medalEmoji = ['🥇', '🥈', '🥉']

export function Dashboard() {
  const { assessments } = useAssessmentStore()
  const { students, fetchStudents } = useStudentStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  // ✅ FIX: Fetch real students and analytics from API
  useEffect(() => {
    fetchStudents()
    const loadAnalytics = async () => {
      try {
        const res = await scoreAPI.getAnalytics()
        setAnalytics(res.data.analytics)
        console.log('[Dashboard] Analytics loaded:', res.data.analytics)
      } catch (err) {
        console.error('[Dashboard] Analytics error:', err)
      } finally {
        setLoadingAnalytics(false)
      }
    }
    loadAnalytics()
  }, [fetchStudents])

  const completionRate = assessments.length
    ? Math.round((assessments.filter((a) => a.status === 'completed').length / assessments.length) * 100)
    : 0

  const totalStudents = analytics?.totalStudents ?? students.length
  const avgScore = analytics?.avgScore ?? 0
  const leaderboard = analytics?.leaderboard ?? []
  const subjectData = analytics?.subjectAverages?.length ? analytics.subjectAverages : assessmentComparisonData

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={<AnimatedNumber value={totalStudents} />} change="from database" positive icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-500/20" />
        <StatCard title="Average Score" value={loadingAnalytics ? '...' : <><AnimatedNumber value={avgScore} />%</>} change="across all assessments" positive icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-500/20" />
        <StatCard title="Completion Rate" value={<><AnimatedNumber value={completionRate} />%</>} change="of assessments" positive icon={CheckCircle} iconColor="text-amber-600" iconBg="bg-amber-500/20" />
        <StatCard title="Assessments" value={<AnimatedNumber value={assessments.length} />} change="total created" positive icon={BookOpen} iconColor="text-purple-600" iconBg="bg-purple-500/20" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Performance Over Time</h2>
            <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><ArrowUpRight size={12} /> +8% this term</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[60, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} fill="url(#perfGrad)" name="Class Score" dot={{ r: 4, fill: '#4F46E5' }} />
              <Line type="monotone" dataKey="average" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Average" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Subject Comparison</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Bar dataKey="classAvg" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Class Avg" />
              <Bar dataKey="topScore" fill="#10B981" radius={[4, 4, 0, 0]} name="Top Score" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Leaderboard + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15"><Trophy size={16} className="text-amber-500" /></div>
              <h2 className="text-base font-semibold text-gray-900">Top Performers</h2>
            </div>
            <button onClick={() => scoreAPI.getAnalytics().then((r) => setAnalytics(r.data.analytics))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
              <RefreshCw size={13} />
            </button>
          </div>
          {loadingAnalytics ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No scores recorded yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/40 transition-colors">
                  <span className="text-lg w-6 text-center">{i < 3 ? medalEmoji[i] : `${i + 1}`}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.grade ? `Grade ${s.grade}` : 'Student'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${i < 3 ? medalColors[i] : 'text-gray-700'}`}>{s.avg}%</p>
                    <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${s.avg}%` }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-indigo-500/15"><Activity size={16} className="text-indigo-500" /></div>
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-1">
            {activityFeed.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/40 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{item.user}</span>{' '}{item.action}{' '}
                    <span className="text-indigo-600 font-medium">{item.target}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent Assessments */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Assessments</h2>
          <span className="text-xs text-gray-400">{assessments.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Title', 'Subject', 'Date', 'Max Score', 'Status'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 5).map((a, i) => (
                <motion.tr key={a.id ?? a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-gray-50 hover:bg-white/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-gray-900">{a.title}</td>
                  <td className="py-3 px-3 text-gray-600">{a.subject}</td>
                  <td className="py-3 px-3 text-gray-600">{a.date}</td>
                  <td className="py-3 px-3 text-gray-600">{a.maxScore}</td>
                  <td className="py-3 px-3">
                    <Badge label={a.status} variant={statusVariant(a.status) as 'success' | 'warning' | 'info'} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
