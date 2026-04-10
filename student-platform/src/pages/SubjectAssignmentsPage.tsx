import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, ClipboardList, FileText, FolderKanban, NotebookPen, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { Modal } from '@/components/ui/Modal'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { useUIStore } from '@/store/useUIStore'
import type { AssignmentItem } from '@/types'

type AssignmentFormData = {
  title: string
  subject: string
  className: string
  description: string
  totalMarks: number
  deadline: string
}

const normalizeClassName = (value?: string) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/class/g, '')
    .replace(/grade/g, '')
    .replace(/\s+/g, '')
    .replace(/(st|nd|rd|th)$/g, '')

const formatClassLabel = (value?: string) => {
  const cleaned = (value ?? '').trim()
  if (!cleaned) return 'Unassigned'
  if (/^class\s+/i.test(cleaned)) return cleaned
  return `Class ${cleaned}`
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const toDateTimeInputValue = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

export function SubjectAssignmentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const decodedClassName = searchParams.get('class') ?? ''
  const decodedSubject = searchParams.get('subject') ?? ''
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssignmentItem | null>(null)
  const [questionFileName, setQuestionFileName] = useState<string | null>(null)
  const [questionFileContent, setQuestionFileContent] = useState<string | null>(null)

  const { adminAssignments, fetchAdminAssignments, updateAssignment, deleteAssignment } = useAssignmentStore()
  const { addToast } = useUIStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AssignmentFormData>()

  useEffect(() => {
    if (adminAssignments.length === 0) {
      fetchAdminAssignments()
    }
  }, [adminAssignments.length, fetchAdminAssignments])

  const matchingAssignments = useMemo(
    () =>
      adminAssignments
        .filter(
          (assignment) =>
            normalizeClassName(assignment.className) === normalizeClassName(decodedClassName) &&
            assignment.subject.trim().toLowerCase() === decodedSubject.trim().toLowerCase()
        )
        .sort((first, second) => new Date(first.deadline).getTime() - new Date(second.deadline).getTime()),
    [adminAssignments, decodedClassName, decodedSubject]
  )

  const openAssessmentsPage = () => navigate('/assessments')

  const openEdit = (assignment: AssignmentItem) => {
    setEditing(assignment)
    setQuestionFileName(assignment.questionFileName ?? null)
    setQuestionFileContent(assignment.questionFileContent ?? null)
    reset({
      title: assignment.title,
      subject: assignment.subject,
      className: assignment.className,
      description: assignment.description,
      totalMarks: assignment.totalMarks,
      deadline: toDateTimeInputValue(assignment.deadline),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setEditing(null)
    setModalOpen(false)
    setQuestionFileName(null)
    setQuestionFileContent(null)
    reset()
  }

  const onSubmit = async (data: AssignmentFormData) => {
    if (!editing) return

    try {
      await updateAssignment(editing.id, {
        ...data,
        totalMarks: Number(data.totalMarks),
        deadline: new Date(data.deadline).toISOString().slice(0, 19),
        questionFileName: questionFileName ?? undefined,
        questionFileContent: questionFileContent ?? undefined,
      })
      addToast('Assignment updated', 'success')
      closeModal()
    } catch (error) {
      console.error('[SubjectAssignmentsPage] Failed to update assignment:', error)
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? (error.request ? 'Cannot reach Spring backend on port 5003.' : error.message)
        : 'Failed to update assignment'
      addToast(message, 'error')
    }
  }

  const handleDelete = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId)
      addToast('Assignment deleted', 'info')
    } catch (error) {
      console.error('[SubjectAssignmentsPage] Failed to delete assignment:', error)
      addToast('Failed to delete assignment', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
              <NotebookPen size={18} />
            </div>
            <div>
              <button
                type="button"
                onClick={openAssessmentsPage}
                className="mb-3 inline-flex items-center gap-2 text-sm text-light-ink-muted transition-colors hover:text-light-ink-primary dark:text-dark-ink-muted dark:hover:text-dark-ink-primary"
              >
                <ArrowLeft size={14} />
                Back to Assignments
              </button>
              <h1 className="text-2xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">{decodedSubject}</h1>
              <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                {formatClassLabel(decodedClassName)} • {matchingAssignments.length} assignment{matchingAssignments.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              label={`${matchingAssignments.filter((assignment) => new Date(assignment.deadline) >= new Date()).length} active`}
              variant="success"
            />
            <Badge
              label={`${matchingAssignments.filter((assignment) => new Date(assignment.deadline) < new Date()).length} closed`}
              variant="danger"
            />
          </div>
        </div>
      </GlassCard>

      {matchingAssignments.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <p className="text-base font-medium text-light-ink-primary dark:text-dark-ink-primary">No assignments found</p>
          <p className="mt-2 text-sm text-light-ink-muted dark:text-dark-ink-muted">
            This subject does not have any assignments for {formatClassLabel(decodedClassName)} right now.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {matchingAssignments.map((assignment) => (
            <SubjectAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={() => openEdit(assignment)}
              onDelete={() => handleDelete(assignment.id)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="Edit Assignment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Title</label>
            <input {...register('title', { required: 'Title is required' })} className="form-input" />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Subject</label>
              <input {...register('subject', { required: 'Subject is required' })} className="form-input" />
              {errors.subject && <p className="mt-1 text-xs text-red-400">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Class</label>
              <input {...register('className', { required: 'Class is required' })} className="form-input" />
              {errors.className && <p className="mt-1 text-xs text-red-400">{errors.className.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Description</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={4}
              className="form-input resize-none"
            />
            {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Question File</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  setQuestionFileName(null)
                  setQuestionFileContent(null)
                  return
                }

                try {
                  const content = await readFileAsDataUrl(file)
                  setQuestionFileName(file.name)
                  setQuestionFileContent(content)
                } catch (error) {
                  console.error('[SubjectAssignmentsPage] Failed to read question file:', error)
                  addToast('Failed to read question file', 'error')
                }
              }}
              className="form-input file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-600"
            />
            <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
              Supported: PNG, JPG, PDF, DOC, DOCX
            </p>
            {questionFileName && (
              <p className="mt-2 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                Attached question file: <span className="font-medium text-light-ink-primary dark:text-dark-ink-primary">{questionFileName}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Total Marks</label>
              <input type="number" min={1} {...register('totalMarks', { required: 'Total marks required', min: 1 })} className="form-input" />
              {errors.totalMarks && <p className="mt-1 text-xs text-red-400">Enter valid total marks</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-light-ink-secondary dark:text-dark-ink-secondary">Deadline</label>
              <input type="datetime-local" {...register('deadline', { required: 'Deadline is required' })} className="form-input" />
              {errors.deadline && <p className="mt-1 text-xs text-red-400">{errors.deadline.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Update Assignment</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SubjectAssignmentCard({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: AssignmentItem
  onEdit: () => void
  onDelete: () => void
}) {
  const isClosed = new Date(assignment.deadline) < new Date()

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              {assignment.subject}
            </span>
            <span className="inline-flex items-center rounded-full border border-light-border bg-white/60 px-3 py-1 text-xs font-semibold text-light-ink-secondary dark:border-dark-border dark:bg-dark-card2/70 dark:text-dark-ink-secondary">
              <FolderKanban size={12} className="mr-1.5" />
              {formatClassLabel(assignment.className)}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.title}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-light-ink-secondary dark:text-dark-ink-secondary">
              {assignment.description}
            </p>
            {assignment.questionFileName && assignment.questionFileContent && (
              <a
                href={assignment.questionFileContent}
                download={assignment.questionFileName}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <FileText size={13} /> {assignment.questionFileName}
              </a>
            )}
          </div>
        </div>
        <Badge label={isClosed ? 'Closed' : 'Open'} variant={isClosed ? 'danger' : 'success'} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-light-card2/80 p-4 dark:bg-dark-card2/80">
          <p className="flex items-center gap-1.5 text-light-ink-muted dark:text-dark-ink-muted">
            <ClipboardList size={13} /> Total Marks
          </p>
          <p className="mt-2 font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.totalMarks}</p>
        </div>
        <div className="rounded-xl bg-light-card2/80 p-4 dark:bg-dark-card2/80">
          <p className="flex items-center gap-1.5 text-light-ink-muted dark:text-dark-ink-muted">
            <Calendar size={13} /> Deadline
          </p>
          <p className="mt-2 font-semibold text-light-ink-primary dark:text-dark-ink-primary">{formatDateTime(assignment.deadline)}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onEdit} className="btn-ghost flex-1 justify-center">
          <Pencil size={14} /> Edit
        </button>
        <button type="button" onClick={onDelete} className="btn-ghost flex-1 justify-center text-red-400 hover:bg-red-500/10">
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </GlassCard>
  )
}
