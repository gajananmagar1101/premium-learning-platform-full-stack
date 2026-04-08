import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAuthStore } from '@/store/useAuthStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useUIStore } from '@/store/useUIStore'
import { Mail, Shield, User, Edit2, Check, Moon, Sun, Bell } from 'lucide-react'
import { motion } from 'framer-motion'

export function Profile() {
  const { user } = useAuthStore()
  const { students } = useStudentStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const { addToast } = useUIStore()

  const student = user?.role === 'student' ? students.find((s) => s._id === (user._id ?? user.id)) : null

  const handleSave = () => {
    setEditing(false)
    addToast('Profile updated successfully', 'success')
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
              {editing ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-xl font-semibold text-gray-900 bg-white/60 border border-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
              )}
              <button
                onClick={editing ? handleSave : () => setEditing(true)}
                className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-600"
              >
                {editing ? <Check size={15} /> : <Edit2 size={15} />}
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
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Grade', value: student.grade || 'N/A', color: 'text-indigo-600' },
              { label: 'Email', value: student.email.split('@')[0], color: 'text-emerald-600' },
              { label: 'Role', value: 'Student', color: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-white/40">
                <p className={`text-base font-bold ${stat.color} truncate`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Info Fields */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-3">
          {[
            { icon: User, label: 'Full Name', value: displayName },
            { icon: Mail, label: 'Email Address', value: user?.email },
            { icon: Shield, label: 'Role', value: user?.role === 'admin' ? 'Administrator / Teacher' : 'Student' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
              <div className="glass-icon bg-indigo-500/10">
                <Icon size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{value}</p>
              </div>
            </div>
          ))}
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
