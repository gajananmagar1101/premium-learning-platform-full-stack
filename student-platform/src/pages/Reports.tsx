import { useState } from 'react'
import { Download, TrendingUp, Users, Award, BarChart2 } from 'lucide-react'
import type { PieLabelRenderProps } from 'recharts'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PieChart, Pie, Cell
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { performanceData, assessmentComparisonData } from '@/data/mockData'
import { useStudentStore } from '@/store/useStudentStore'
import { motion } from 'framer-motion'

const radarData = [
  { subject: 'Math', A: 88 }, { subject: 'English', A: 82 },
  { subject: 'Science', A: 75 }, { subject: 'History', A: 80 },
]

const gradeDistribution = [
  { name: 'A (90-100)', value: 2, color: '#10B981' },
  { name: 'B (80-89)', value: 2, color: '#4F46E5' },
  { name: 'C (70-79)', value: 1, color: '#F59E0B' },
  { name: 'D (<70)', value: 0, color: '#EF4444' },
]

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
  const cxN = Number(cx ?? 0)
  const cyN = Number(cy ?? 0)
  const irN = Number(innerRadius ?? 0)
  const orN = Number(outerRadius ?? 0)
  const r = irN + (orN - irN) * 0.5
  const x = cxN + r * Math.cos(-Number(midAngle ?? 0) * RADIAN)
  const y = cyN + r * Math.sin(-Number(midAngle ?? 0) * RADIAN)
  return Number(percent ?? 0) > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(Number(percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  ) : null
}

const terms = ['Spring 2024', 'Summer 2024', 'Fall 2024']

export function Reports() {
  const { students } = useStudentStore()
  const [term, setTerm] = useState('Summer 2024')

  const avgScore = Math.round(
    students.reduce((a) => a + 75, 0) / Math.max(students.length, 1)
  )

  const studentComparisonData = students.map((s) => ({
    name: s.name.split(' ')[0],
    avg: 75, // placeholder — real avg loaded via analytics API
  }))

  const summaryStats = [
    { label: 'Class Average', value: `${avgScore}%`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Top Performer', value: '95%', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pass Rate', value: '92%', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Improvement', value: '+8%', icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">Analytics overview ·</p>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {terms.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
        >
          <Download size={15} /> Export Report
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryStats.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <GlassCard hover className="p-4">
              <div className={`inline-flex p-2 rounded-xl ${item.bg} mb-2`}>
                <item.icon size={16} className={item.color} />
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Score Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[60, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} fill="url(#scoreGrad)" name="Score" />
              <Area type="monotone" dataKey="average" stroke="#10B981" strokeWidth={2} fill="none" strokeDasharray="4 4" name="Average" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie data={gradeDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={renderLabel}>
                  {gradeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {gradeDistribution.map((g) => (
                <div key={g.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <p className="text-xs text-gray-600">{g.name}</p>
                  <span className="text-xs font-semibold text-gray-900 ml-auto">{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Student Comparison</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={studentComparisonData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]} name="Avg Score">
                {studentComparisonData.map((_, i) => (
                  <Cell key={i} fill={['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Subject Radar</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <Radar name="Score" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Subject Breakdown */}
      <GlassCard className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Subject Performance Breakdown</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={assessmentComparisonData} barSize={28}>
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
  )
}
