import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import type { Assessment } from '@/types'

type FormData = Omit<Assessment, 'id'>

const statusVariant = (s: string) =>
  s === 'completed' ? 'success' : s === 'upcoming' ? 'info' : 'warning'

const subjects = ['All', 'Mathematics', 'English', 'Science', 'History']
const statuses = ['All', 'upcoming', 'completed', 'grading']

export function Assessments() {
  const { user } = useAuthStore()
  const { assessments, addAssessment, updateAssessment, deleteAssessment } = useAssessmentStore()
  const { addToast } = useUIStore()
  const isAdmin = user?.role === 'admin'
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const openAdd = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (a: Assessment) => { setEditing(a); reset(a); setModalOpen(true) }
  const onClose = () => { setModalOpen(false); setEditing(null); reset({}) }

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        await updateAssessment(editing.id ?? editing._id ?? '', data)
        addToast('Assessment updated', 'success')
      } else {
        await addAssessment(data)
        addToast('Assessment created', 'success')
      }
      onClose()
    } catch {
      addToast('Failed to save assessment', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAssessment(id)
      addToast('Assessment deleted', 'info')
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  const filtered = assessments.filter((a) => {
    const q = search.toLowerCase()
    return (
      (a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q)) &&
      (subjectFilter === 'All' || a.subject === subjectFilter) &&
      (statusFilter === 'All' || a.status === statusFilter)
    )
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments..."
              className="form-input w-full pl-9 sm:w-52" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-light-ink-muted dark:text-dark-ink-muted" />
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="form-input w-full py-2 pr-3 sm:w-auto">
              {subjects.map((s) => <option key={s} className="bg-card">{s}</option>)}
            </select>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full py-2 pr-3 sm:w-auto">
            {statuses.map((s) => <option key={s} className="bg-card capitalize">{s}</option>)}
          </select>
        </div>

        {isAdmin && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={openAdd} className="btn-primary w-full justify-center shrink-0 sm:w-auto">
            <Plus size={16} /> Add Assessment
          </motion.button>
        )}
      </div>

      <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{filtered.length} of {assessments.length} assessments</p>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Title', 'Subject', 'Date', 'Max Score', 'Status', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-14 text-center text-light-ink-muted dark:text-dark-ink-muted">
                      No assessments match your filters
                    </td>
                  </tr>
                ) : filtered.map((a, i) => (
                  <motion.tr key={a.id ?? a._id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                    <td className="max-w-48 font-semibold text-light-ink-primary dark:text-dark-ink-primary truncate">{a.title}</td>
                    <td className="text-light-ink-secondary dark:text-dark-ink-secondary whitespace-nowrap">{a.subject}</td>
                    <td className="text-light-ink-secondary dark:text-dark-ink-secondary whitespace-nowrap">{a.date}</td>
                    <td className="text-light-ink-secondary dark:text-dark-ink-secondary whitespace-nowrap">{a.maxScore}</td>
                    <td><Badge label={a.status} variant={statusVariant(a.status) as 'success' | 'warning' | 'info'} /></td>
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-ink-muted hover:text-indigo-400 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(a.id ?? a._id ?? '')}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-ink-muted hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal */}
      {isAdmin && (
        <Modal open={modalOpen} onClose={onClose} title={editing ? 'Edit Assessment' : 'New Assessment'}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'title' as const, label: 'Title', type: 'text' },
              { name: 'subject' as const, label: 'Subject', type: 'text' },
              { name: 'date' as const, label: 'Date', type: 'date' },
              { name: 'maxScore' as const, label: 'Max Score', type: 'number' },
            ].map(({ name, label, type }) => (
              <div key={name}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">{label}</label>
                <input type={type}
                  {...register(name, { required: true, valueAsNumber: type === 'number' })}
                  className="form-input" />
                {errors[name] && <p className="text-xs text-red-400 mt-1">Required</p>}
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Status</label>
              <select {...register('status', { required: true })} className="form-input">
                <option value="upcoming" className="bg-card">Upcoming</option>
                <option value="completed" className="bg-card">Completed</option>
                <option value="grading" className="bg-card">Grading</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
