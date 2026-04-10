import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, Trash2, UserX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Modal } from '@/components/ui/Modal'
import { useStudentStore } from '@/store/useStudentStore'
import { useUIStore } from '@/store/useUIStore'
import { studentAPI } from '@/lib/services'
import type { DBStudent } from '@/types'
import { StudentDrawer } from '@/pages/Students'

const avatarColors = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-cyan-600',
]

const normalizeGrade = (value?: string) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/class/g, '')
    .replace(/grade/g, '')
    .replace(/\s+/g, '')
    .replace(/(st|nd|rd|th)$/g, '')

const formatClassLabel = (value: string) => `${value}${value === '1' ? 'st' : value === '2' ? 'nd' : value === '3' ? 'rd' : 'th'} Standard`

export function ClassStudentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const grade = searchParams.get('grade') ?? '1'
  const studentId = searchParams.get('student')
  const { students, loading, error, fetchStudents, removeStudent } = useStudentStore()
  const { addToast } = useUIStore()
  const [selected, setSelected] = useState<DBStudent | null>(null)
  const [search, setSearch] = useState('')
  const [studentToDelete, setStudentToDelete] = useState<DBStudent | null>(null)

  useEffect(() => {
    if (students.length === 0) {
      fetchStudents()
    }
  }, [fetchStudents, students.length])

  useEffect(() => {
    if (!studentId || students.length === 0) return
    const targetStudent = students.find((student) => (student._id ?? student.id) === studentId)
    if (targetStudent && normalizeGrade(targetStudent.grade) === grade) {
      setSelected(targetStudent)
    }
  }, [grade, studentId, students])

  const filtered = useMemo(
    () =>
      students
        .filter((student) => normalizeGrade(student.grade) === grade)
        .filter((student) => {
          const query = search.toLowerCase().trim()
          if (!query) return true
          return student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query)
        })
        .sort((left, right) => left.name.localeCompare(right.name)),
    [grade, search, students]
  )

  const openDeleteConfirmation = (student: DBStudent, e: React.MouseEvent) => {
    e.stopPropagation()
    setStudentToDelete(student)
  }

  const handleDelete = async () => {
    if (!studentToDelete) return

    const studentId = studentToDelete._id ?? studentToDelete.id
    try {
      await studentAPI.delete(studentId)
      removeStudent(studentId)
      addToast('Student deleted successfully', 'info')
      if ((selected?._id ?? selected?.id) === studentId) setSelected(null)
      setStudentToDelete(null)
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
        <button onClick={fetchStudents} className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-xl hover:bg-indigo-600 transition-colors">
          Retry
        </button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="mb-3 inline-flex items-center gap-2 text-sm text-light-ink-muted transition-colors hover:text-light-ink-primary dark:text-dark-ink-muted dark:hover:text-dark-ink-primary"
            >
              <ArrowLeft size={14} />
              Back to Classes
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{formatClassLabel(grade)}</h1>
            <p className="mt-1 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'student' : 'students'} in this class</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students..."
              className="form-input w-56"
            />
            <button onClick={fetchStudents} className="btn-ghost">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <p className="text-sm font-medium text-gray-600">No students found in {formatClassLabel(grade)}</p>
          <p className="mt-1 text-xs text-gray-400">Students from this class will appear here.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((student, studentIndex) => {
            const colorIndex = studentIndex % avatarColors.length
            return (
              <motion.div key={student._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: studentIndex * 0.04 }}>
                <GlassCard hover className="p-5 cursor-pointer" onClick={() => setSelected(student)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {formatClassLabel(grade)}
                        </span>
                        <span className="text-xs text-gray-400">Joined {new Date(student.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => openDeleteConfirmation(student, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete student"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-indigo-500 mt-3 font-medium">Click to view scores & details →</p>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <Modal
        open={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        title="Delete Student Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-light-ink-secondary dark:text-dark-ink-secondary">
            Are you sure you want to delete {studentToDelete?.name}'s account? Their scores and related data may also be removed.
          </p>
          <div className="rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-600">
            This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setStudentToDelete(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
            >
              Delete Student
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
