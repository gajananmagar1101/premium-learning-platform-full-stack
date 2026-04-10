import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, ClipboardList, Edit3, FileText, FolderKanban, NotebookPen, Pencil, Plus, Save, Search, Trash2, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import axios from 'axios'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { useAssignmentStore } from '@/store/useAssignmentStore'
import { useStudentStore } from '@/store/useStudentStore'
import type { AdminSubmission, AssignmentItem, StudentAssignmentItem } from '@/types'

type AssignmentFormData = {
  title: string
  subject: string
  className: string
  description: string
  totalMarks: number
  deadline: string
}

type SubmissionFormData = {
  content: string
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

const classSortValue = (value?: string) => {
  const normalized = normalizeClassName(value)
  const numeric = Number(normalized)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

const statusVariant = (status: string) => {
  if (status === 'graded') return 'success'
  if (status === 'submitted') return 'info'
  if (status === 'pending') return 'warning'
  return 'danger'
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

function AdminAssignmentsView() {
  const {
    adminAssignments,
    submissions,
    fetchAdminAssignments,
    fetchAdminSubmissions,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    gradeSubmission,
  } = useAssignmentStore()
  const { addToast, addNotification, addNotificationForUsers } = useUIStore()
  const { students, fetchStudents } = useStudentStore()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssignmentItem | null>(null)
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({})
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AssignmentFormData>()

  useEffect(() => {
    fetchAdminAssignments()
    fetchAdminSubmissions()
    fetchStudents()
  }, [fetchAdminAssignments, fetchAdminSubmissions, fetchStudents])

  const gradedCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'graded').length,
    [submissions]
  )

  const pendingReviewCount = useMemo(
    () => submissions.filter((submission) => submission.status !== 'graded').length,
    [submissions]
  )

  const overdueCount = useMemo(
    () => adminAssignments.filter((assignment) => new Date(assignment.deadline) < new Date()).length,
    [adminAssignments]
  )

  const filteredAssignments = useMemo(() => {
    const query = search.toLowerCase().trim()
    const sortedAssignments = [...adminAssignments].sort(
      (first, second) => new Date(first.deadline).getTime() - new Date(second.deadline).getTime()
    )
    if (!query) return sortedAssignments
    return sortedAssignments.filter((assignment) =>
      assignment.title.toLowerCase().includes(query) ||
      assignment.subject.toLowerCase().includes(query) ||
      assignment.description.toLowerCase().includes(query) ||
      assignment.className.toLowerCase().includes(query)
    )
  }, [adminAssignments, search])

  const orderedSubmissions = useMemo(
    () =>
      [...submissions].sort((first, second) => {
        if (first.status === second.status) {
          return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
        }
        if (first.status === 'graded') return 1
        if (second.status === 'graded') return -1
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      }),
    [submissions]
  )

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, AssignmentItem[]>()

    filteredAssignments.forEach((assignment) => {
      const key = assignment.className?.trim() || 'Unassigned'
      const current = groups.get(key) ?? []
      current.push(assignment)
      groups.set(key, current)
    })

    return [...groups.entries()]
      .sort((first, second) => {
        const classCompare = classSortValue(first[0]) - classSortValue(second[0])
        if (classCompare !== 0) return classCompare
        return first[0].localeCompare(second[0])
      })
      .map(([className, assignments]) => ({
        className,
        assignments,
      }))
  }, [filteredAssignments])

  const openCreate = () => {
    setEditing(null)
    reset({
      title: '',
      subject: '',
      className: '',
      description: '',
      totalMarks: 10,
      deadline: '',
    })
    setModalOpen(true)
  }

  const openEdit = (assignment: AssignmentItem) => {
    setEditing(assignment)
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
    reset()
  }

  const onSubmit = async (data: AssignmentFormData) => {
    const payload = {
      ...data,
      totalMarks: Number(data.totalMarks),
      deadline: new Date(data.deadline).toISOString().slice(0, 19),
    }

    try {
      if (editing) {
        await updateAssignment(editing.id, payload)
        addToast('Assignment updated', 'success')
        addNotification({
          title: 'Assignment updated',
          message: `${payload.title} for class ${payload.className} was updated.`,
          type: 'info',
        })
        const targetStudentIds = students
          .filter((student) => normalizeClassName(student.grade) === normalizeClassName(payload.className))
          .map((student) => student.id ?? student._id)
        addNotificationForUsers(targetStudentIds, {
          title: 'Assignment updated',
          message: `${payload.title} was updated for your class.`,
          type: 'info',
        })
      } else {
        await createAssignment(payload)
        addToast('Assignment created', 'success')
        addNotification({
          title: 'Assignment created',
          message: `${payload.title} for class ${payload.className} is now live.`,
          type: 'success',
        })
        const targetStudentIds = students
          .filter((student) => normalizeClassName(student.grade) === normalizeClassName(payload.className))
          .map((student) => student.id ?? student._id)
        addNotificationForUsers(targetStudentIds, {
          title: 'New assignment',
          message: `${payload.title} has been posted for class ${payload.className}.`,
          type: 'info',
        })
      }
      closeModal()
    } catch (error) {
      console.error('[Assignments] Failed to save assignment:', error)
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? (error.request ? 'Cannot reach Spring backend on port 5003.' : error.message)
        : 'Failed to save assignment'
      addToast(message, 'error')
    }
  }

  const handleDelete = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId)
      addToast('Assignment deleted', 'info')
      addNotification({
        title: 'Assignment deleted',
        message: 'An assignment was removed from the control center.',
        type: 'warning',
      })
    } catch (error) {
      console.error('[Assignments] Failed to delete assignment:', error)
      addToast('Failed to delete assignment', 'error')
    }
  }

  const handleSaveMarks = async (submission: AdminSubmission) => {
    const rawValue = gradeInputs[submission.id] ?? String(submission.marks ?? '')
    const marks = Number(rawValue)
    if (Number.isNaN(marks)) {
      addToast('Enter valid marks first', 'error')
      return
    }

    try {
      await gradeSubmission(submission.id, marks)
      addToast('Marks saved', 'success')
      addNotification({
        title: 'Marks published',
        message: `Saved ${marks}/${submission.totalMarks} for ${submission.studentName}.`,
        type: 'success',
      })
    } catch (error) {
      console.error('[Assignments] Failed to grade submission:', error)
      addToast('Failed to save marks', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Assignment Control Center</h2>
              <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                Create assignments, review submissions, and publish grades.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge label={`${pendingReviewCount} pending review`} variant="warning" />
              <Badge label={`${gradedCount} graded`} variant="success" />
              <Badge label={`${overdueCount} closed`} variant="danger" />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreate}
            className="btn-primary justify-center xl:self-center"
          >
            <Plus size={16} /> Create Assignment
          </motion.button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Assignments</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{adminAssignments.length}</p>
            </div>
            <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
              <NotebookPen size={18} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Submissions</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{submissions.length}</p>
            </div>
            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-400">
              <Upload size={18} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Pending Review</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{pendingReviewCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
              <ClipboardList size={18} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Graded</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{gradedCount}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
              <Save size={18} />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Assignment Library</h3>
            <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Upcoming deadlines stay on top so review is quicker.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, subject, class..."
                className="form-input pl-9"
              />
            </div>
            <div className="rounded-2xl border border-light-border px-3 py-2 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
              {filteredAssignments.length} of {adminAssignments.length} assignments
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groupedAssignments.map((group) => (
          <GlassCard key={group.className} className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
                <FolderKanban size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                  {formatClassLabel(group.className)}
                </p>
                <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                  {group.assignments.length} assignment{group.assignments.length === 1 ? '' : 's'}
                </p>
                <p className="mt-2 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                  {group.assignments.filter((assignment) => new Date(assignment.deadline) >= new Date()).length} active
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-6">
        {groupedAssignments.map((group) => {
          const groupedBySubject = [...group.assignments]
            .reduce<Map<string, AssignmentItem[]>>((collection, assignment) => {
              const subjectKey = assignment.subject?.trim() || 'General'
              const current = collection.get(subjectKey) ?? []
              current.push(assignment)
              collection.set(subjectKey, current)
              return collection
            }, new Map<string, AssignmentItem[]>())

          const subjectGroups = [...groupedBySubject.entries()]
            .sort((first, second) => first[0].localeCompare(second[0]))
            .map(([subject, assignments]) => ({
              subject,
              assignments,
            }))

          return (
            <GlassCard key={group.className} className="overflow-hidden p-0">
              <details open={Boolean(search) || groupedAssignments[0]?.className === group.className} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
                      <FolderKanban size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                        {formatClassLabel(group.className)}
                      </h3>
                      <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                        {group.assignments.length} assignment{group.assignments.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden flex-wrap gap-2 sm:flex">
                      <Badge
                        label={`${group.assignments.filter((assignment) => new Date(assignment.deadline) >= new Date()).length} active`}
                        variant="success"
                      />
                      <Badge
                        label={`${group.assignments.filter((assignment) => new Date(assignment.deadline) < new Date()).length} closed`}
                        variant="danger"
                      />
                    </div>
                    <ChevronDown size={18} className="text-light-ink-muted transition-transform group-open:rotate-180 dark:text-dark-ink-muted" />
                  </div>
                </summary>

                <div className="space-y-3 border-t border-light-border px-4 py-3 dark:border-dark-border">
                  {subjectGroups.map((subjectGroup) => (
                    <div key={`${group.className}-${subjectGroup.subject}`} className="overflow-hidden rounded-2xl border border-light-border dark:border-dark-border">
                      <details open={Boolean(search)} className="group/subject">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-white/35 px-4 py-3 dark:bg-dark-card2/35">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                              <NotebookPen size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                                {subjectGroup.subject}
                              </p>
                              <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                                {subjectGroup.assignments.length} assignment{subjectGroup.assignments.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                          <ChevronDown size={16} className="text-light-ink-muted transition-transform group-open/subject:rotate-180 dark:text-dark-ink-muted" />
                        </summary>

                        <div className="grid grid-cols-1 gap-4 border-t border-light-border px-4 py-4 dark:border-dark-border xl:grid-cols-2">
                          {subjectGroup.assignments.map((assignment) => {
                            const isClosed = new Date(assignment.deadline) < new Date()

                            return (
                              <div
                                key={assignment.id}
                                className="rounded-3xl border border-light-border bg-white/55 p-5 shadow-sm dark:border-dark-border dark:bg-dark-card2/50"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                                        {assignment.subject}
                                      </span>
                                      <span className="inline-flex items-center rounded-full border border-light-border bg-white/60 px-3 py-1 text-xs font-semibold text-light-ink-secondary dark:border-dark-border dark:bg-dark-card2/70 dark:text-dark-ink-secondary">
                                        {formatClassLabel(assignment.className)}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.title}</p>
                                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-light-ink-secondary dark:text-dark-ink-secondary">
                                        {assignment.description}
                                      </p>
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
                                  <button onClick={() => openEdit(assignment)} className="btn-ghost flex-1 justify-center">
                                    <Pencil size={14} /> Edit
                                  </button>
                                  <button onClick={() => handleDelete(assignment.id)} className="btn-ghost flex-1 justify-center text-red-400 hover:bg-red-500/10">
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </details>
            </GlassCard>
          )
        })}
        {groupedAssignments.length === 0 && (
          <GlassCard className="py-16 text-center xl:col-span-2">
            <p className="text-base font-medium text-light-ink-primary dark:text-dark-ink-primary">No assignments found</p>
            <p className="mt-2 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Try another search or create a new assignment.
            </p>
          </GlassCard>
        )}
      </div>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-light-border px-5 py-4 dark:border-dark-border lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Student Submissions</h3>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Recent work appears first, and ungraded items stay ahead of completed reviews.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={`${pendingReviewCount} to review`} variant="warning" />
            <Badge label={`${gradedCount} graded`} variant="success" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Student', 'Assignment', 'Submitted Work', 'Status', 'Marks', 'Save'].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {orderedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-light-ink-muted dark:text-dark-ink-muted">
                    No student submissions yet.
                  </td>
                </tr>
              ) : orderedSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{submission.studentName}</p>
                    <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{submission.studentEmail}</p>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <p className="font-medium text-light-ink-primary dark:text-dark-ink-primary">{submission.assignmentTitle}</p>
                      <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">
                        {submission.subject} · Due {formatDateTime(submission.deadline)}
                      </p>
                    </div>
                  </td>
                  <td className="max-w-72">
                    {submission.content && (
                      <p className="line-clamp-3 text-sm text-light-ink-secondary dark:text-dark-ink-secondary">{submission.content}</p>
                    )}
                    {submission.fileName && submission.fileContent && (
                      <a
                        href={submission.fileContent}
                        download={submission.fileName}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <FileText size={13} /> {submission.fileName}
                      </a>
                    )}
                    <p className="mt-2 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      Submitted {formatDateTime(submission.updatedAt)}
                    </p>
                  </td>
                  <td>
                    <div className="space-y-2">
                      <Badge label={submission.status} variant={statusVariant(submission.status)} />
                      {submission.late && <Badge label="Late" variant="danger" />}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={submission.totalMarks}
                        value={gradeInputs[submission.id] ?? String(submission.marks ?? '')}
                        onChange={(event) => setGradeInputs((current) => ({ ...current, [submission.id]: event.target.value }))}
                        className="form-input w-24"
                      />
                      <span className="text-xs text-light-ink-muted dark:text-dark-ink-muted">/ {submission.totalMarks}</span>
                    </div>
                  </td>
                  <td>
                    <button onClick={() => handleSaveMarks(submission)} className="btn-primary justify-center">
                      <Save size={14} /> Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Assignment' : 'Create Assignment'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Title</label>
            <input {...register('title', { required: true })} className="form-input" />
            {errors.title && <p className="text-xs text-red-400 mt-1">Title is required.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Subject</label>
            <input {...register('subject', { required: true })} className="form-input" />
            {errors.subject && <p className="text-xs text-red-400 mt-1">Subject is required.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Class</label>
            <input
              {...register('className', { required: true })}
              className="form-input"
              placeholder="e.g. 9th, 10, 10-A"
            />
            {errors.className && <p className="text-xs text-red-400 mt-1">Class is required.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Description</label>
            <textarea {...register('description', { required: true })} rows={5} className="form-input resize-none" />
            {errors.description && <p className="text-xs text-red-400 mt-1">Description is required.</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Total Marks</label>
              <input type="number" min={1} {...register('totalMarks', { required: true, valueAsNumber: true })} className="form-input" />
              {errors.totalMarks && <p className="text-xs text-red-400 mt-1">Enter valid total marks.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Deadline</label>
              <input type="datetime-local" {...register('deadline', { required: true })} className="form-input" />
              {errors.deadline && <p className="text-xs text-red-400 mt-1">Deadline is required.</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {editing ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function StudentAssignmentsView() {
  const user = useAuthStore((state) => state.user)
  const {
    studentAssignments,
    fetchStudentAssignments,
    submitAssignment,
    updateSubmission,
  } = useAssignmentStore()
  const { addToast, addNotification, addNotificationForRole } = useUIStore()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<StudentAssignmentItem | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubmissionFormData>()

  useEffect(() => {
    fetchStudentAssignments()
  }, [fetchStudentAssignments])

  const filteredAssignments = useMemo(() => {
    const query = search.toLowerCase().trim()
    const studentClass = normalizeClassName(user?.grade)
    const classMatchedAssignments = studentAssignments.filter((assignment) => {
      const assignmentClass = normalizeClassName(assignment.className)
      return Boolean(assignmentClass) && Boolean(studentClass) && assignmentClass === studentClass
    })

    if (!query) return classMatchedAssignments
    return classMatchedAssignments.filter((assignment) =>
      assignment.title.toLowerCase().includes(query) ||
      assignment.subject.toLowerCase().includes(query) ||
      assignment.description.toLowerCase().includes(query)
    )
  }, [search, studentAssignments, user?.grade])

  const assignmentsBySubject = useMemo(() => {
    const grouped = filteredAssignments.reduce<Map<string, StudentAssignmentItem[]>>((collection, assignment) => {
      const subjectKey = assignment.subject?.trim() || 'General'
      const current = collection.get(subjectKey) ?? []
      current.push(assignment)
      collection.set(subjectKey, current)
      return collection
    }, new Map<string, StudentAssignmentItem[]>())

    return [...grouped.entries()]
      .sort((first, second) => first[0].localeCompare(second[0]))
      .map(([subject, assignments]) => ({
        subject,
        assignments,
      }))
  }, [filteredAssignments])

  const openSubmissionModal = (assignment: StudentAssignmentItem) => {
    setActiveAssignment(assignment)
    setFileName(assignment.submission?.fileName ?? null)
    setFileContent(assignment.submission?.fileContent ?? null)
    reset({ content: assignment.submission?.content ?? '' })
    setModalOpen(true)
  }

  const closeModal = () => {
    setActiveAssignment(null)
    setFileName(null)
    setFileContent(null)
    reset({ content: '' })
    setModalOpen(false)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const encoded = await readFileAsDataUrl(file)
      setFileName(file.name)
      setFileContent(encoded)
    } catch (error) {
      console.error('[Assignments] Failed to read upload:', error)
      addToast('Could not read the selected file', 'error')
    }
  }

  const onSubmit = async (data: SubmissionFormData) => {
    if (!activeAssignment) return

    const payload = {
      assignmentId: activeAssignment.id,
      content: data.content,
      fileName: fileName ?? undefined,
      fileContent: fileContent ?? undefined,
    }

    try {
      if (activeAssignment.submission?.id) {
        await updateSubmission(activeAssignment.submission.id, payload)
        addToast('Submission updated', 'success')
        addNotification({
          title: 'Submission updated',
          message: `Your work for ${activeAssignment.title} was updated.`,
          type: 'info',
        })
        addNotificationForRole('admin', {
          title: 'Submission updated',
          message: `${user?.name ?? 'A student'} updated work for ${activeAssignment.title}.`,
          type: 'info',
        })
      } else {
        await submitAssignment(payload)
        addToast('Assignment submitted', 'success')
        addNotification({
          title: 'Assignment submitted',
          message: `Your submission for ${activeAssignment.title} was sent successfully.`,
          type: 'success',
        })
        addNotificationForRole('admin', {
          title: 'New submission',
          message: `${user?.name ?? 'A student'} submitted ${activeAssignment.title}.`,
          type: 'info',
        })
      }
      closeModal()
    } catch (error) {
      console.error('[Assignments] Failed to save submission:', error)
      addToast('Failed to save submission', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-light-ink-primary dark:text-dark-ink-primary">Assignments</h2>
        <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted mt-1">
          Review tasks, upload work, and track your grades in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Pending</p>
          <p className="text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary mt-2">
            {studentAssignments.filter((assignment) => assignment.status === 'pending').length}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Submitted</p>
          <p className="text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary mt-2">
            {studentAssignments.filter((assignment) => assignment.status === 'submitted').length}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Graded</p>
          <p className="text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary mt-2">
            {studentAssignments.filter((assignment) => assignment.status === 'graded').length}
          </p>
        </GlassCard>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search assignments..."
          className="form-input pl-9"
        />
      </div>

      <div className="space-y-5">
        {assignmentsBySubject.map((subjectGroup) => (
          <GlassCard key={subjectGroup.subject} className="overflow-hidden p-0">
            <details open={Boolean(search)} className="group/subject">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
                    <NotebookPen size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                      {subjectGroup.subject}
                    </h3>
                    <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                      {subjectGroup.assignments.length} assignment{subjectGroup.assignments.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className="text-light-ink-muted transition-transform group-open/subject:rotate-180 dark:text-dark-ink-muted" />
              </summary>

              <div className="grid grid-cols-1 gap-4 border-t border-light-border px-4 py-4 dark:border-dark-border xl:grid-cols-2">
                {subjectGroup.assignments.map((assignment) => (
                  <GlassCard key={assignment.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                          <NotebookPen size={12} /> {assignment.subject}
                        </div>
                        <div className="ml-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {formatClassLabel(assignment.className)}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.title}</h3>
                      </div>
                      <Badge label={assignment.status} variant={statusVariant(assignment.status)} />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-light-ink-secondary dark:text-dark-ink-secondary">
                      {assignment.description}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
                        <p className="flex items-center gap-1.5 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                          <ClipboardList size={12} /> Total Marks
                        </p>
                        <p className="mt-2 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.totalMarks}</p>
                      </div>
                      <div className="rounded-xl bg-light-card2/70 p-3 dark:bg-dark-card2/80">
                        <p className="flex items-center gap-1.5 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                          <Calendar size={12} /> Deadline
                        </p>
                        <p className="mt-2 text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{formatDateTime(assignment.deadline)}</p>
                      </div>
                    </div>

                    {assignment.submission && (
                      <div className="mt-4 rounded-2xl border border-light-border bg-white/30 p-4 dark:border-dark-border dark:bg-dark-card2/50">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Your Submission</p>
                          {typeof assignment.submission.marks === 'number' && (
                            <span className="text-sm font-semibold text-emerald-400">
                              {assignment.submission.marks}/{assignment.totalMarks}
                            </span>
                          )}
                        </div>
                        {assignment.submission.content && (
                          <p className="mt-3 line-clamp-3 text-sm text-light-ink-secondary dark:text-dark-ink-secondary">
                            {assignment.submission.content}
                          </p>
                        )}
                        {assignment.submission.fileName && assignment.submission.fileContent && (
                          <a
                            href={assignment.submission.fileContent}
                            download={assignment.submission.fileName}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            <FileText size={13} /> {assignment.submission.fileName}
                          </a>
                        )}
                        <p className="mt-3 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                          Last updated {formatDateTime(assignment.submission.updatedAt)}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => openSubmissionModal(assignment)}
                        disabled={assignment.submissionClosed}
                        className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assignment.submission ? <><Edit3 size={14} /> Edit Submission</> : <><Upload size={14} /> Submit Assignment</>}
                      </button>
                      {assignment.submissionClosed && (
                        <span className="self-center text-xs text-red-400">Deadline passed. Submission is locked.</span>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </details>
          </GlassCard>
        ))}

        {assignmentsBySubject.length === 0 && (
          <div className="py-16 text-center text-light-ink-muted dark:text-dark-ink-muted">
            No assignments available right now.
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={activeAssignment?.submission ? 'Edit Submission' : 'Submit Assignment'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-2xl bg-light-card2/60 dark:bg-dark-card2/70 p-4">
            <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{activeAssignment?.title}</p>
            <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted mt-1">
              Due {activeAssignment ? formatDateTime(activeAssignment.deadline) : ''}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Text Submission</label>
            <textarea
              {...register('content')}
              rows={6}
              className="form-input resize-none"
              placeholder="Write your answer or paste your assignment text here..."
            />
            {errors.content && <p className="text-xs text-red-400 mt-1">Please add content or upload a file.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Upload File</label>
            <input type="file" onChange={handleFileChange} className="form-input file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-2 file:text-indigo-300" />
            {fileName && (
              <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted mt-2">
                Attached file: <span className="font-medium text-light-ink-primary dark:text-dark-ink-primary">{fileName}</span>
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {activeAssignment?.submission ? 'Update Submission' : 'Save Submission'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export function Assessments() {
  const user = useAuthStore((state) => state.user)

  if (user?.role === 'admin') {
    return <AdminAssignmentsView />
  }

  return <StudentAssignmentsView />
}
