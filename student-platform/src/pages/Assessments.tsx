import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, CheckCheck, ChevronDown, ClipboardList, Clock3, Copy, Edit3, FileText, FolderKanban, NotebookPen, Plus, Save, Search, Trash2, Upload } from 'lucide-react'
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
import { academicYearSortValue, btechYearOptions, formatAcademicYearLabel, normalizeAcademicYear } from '@/lib/btech'
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

const classOptions = btechYearOptions

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatClassLabel = (value?: string) => {
  const normalized = normalizeAcademicYear(value)
  return normalized ? formatAcademicYearLabel(normalized) : 'Unassigned'
}

const classSortValue = (value?: string) => {
  const index = academicYearSortValue(value)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
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
  const navigate = useNavigate()
  const {
    adminAssignments,
    submissions,
    fetchAdminAssignments,
    fetchAdminSubmissions,
    createAssignment,
    deleteAssignment,
    updateAssignment,
    gradeSubmission,
  } = useAssignmentStore()
  const { addToast } = useUIStore()
  const { students, fetchStudents } = useStudentStore()
  const [search, setSearch] = useState('')
  const [assignmentYearFilter, setAssignmentYearFilter] = useState<'all' | string>('all')
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<'all' | 'active' | 'closed' | 'dueSoon'>('all')
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState<'all' | string>('all')
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'toReview' | 'graded' | 'late'>('all')
  const [submissionYearFilter, setSubmissionYearFilter] = useState<'all' | string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssignmentItem | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentItem | null>(null)
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({})
  const [questionFileName, setQuestionFileName] = useState<string | null>(null)
  const [questionFileContent, setQuestionFileContent] = useState<string | null>(null)
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

  const dueSoonCount = useMemo(() => {
    const now = new Date().getTime()
    const threeDays = 1000 * 60 * 60 * 24 * 3
    return adminAssignments.filter((assignment) => {
      const deadline = new Date(assignment.deadline).getTime()
      return deadline >= now && deadline - now <= threeDays
    }).length
  }, [adminAssignments])

  const lateSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.late).length,
    [submissions]
  )

  const gradingCompletionRate = useMemo(() => {
    if (submissions.length === 0) return 0
    return Math.round((gradedCount / submissions.length) * 100)
  }, [gradedCount, submissions.length])

  const subjectOptions = useMemo(
    () =>
      [...new Set(adminAssignments.map((assignment) => assignment.subject?.trim()).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second)),
    [adminAssignments]
  )

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

  const studentGradeById = useMemo(
    () =>
      students.reduce<Record<string, string>>((collection, student) => {
        const studentId = student.id ?? student._id
        if (studentId) {
          collection[studentId] = student.grade
        }
        return collection
      }, {}),
    [students]
  )

  const filteredSubmissions = useMemo(() => {
    const query = search.toLowerCase().trim()
    return orderedSubmissions.filter((submission) => {
      const matchesQuery = !query || (
        submission.studentName.toLowerCase().includes(query) ||
        submission.studentEmail.toLowerCase().includes(query) ||
        submission.assignmentTitle.toLowerCase().includes(query) ||
        submission.subject.toLowerCase().includes(query) ||
        (submission.fileName?.toLowerCase().includes(query) ?? false)
      )
      const cohort = normalizeAcademicYear(studentGradeById[submission.studentId])
      const matchesYear = submissionYearFilter === 'all' || cohort === submissionYearFilter
      const matchesStatus =
        submissionStatusFilter === 'all' ||
        (submissionStatusFilter === 'toReview' && submission.status !== 'graded') ||
        (submissionStatusFilter === 'graded' && submission.status === 'graded') ||
        (submissionStatusFilter === 'late' && submission.late)
      return matchesQuery && matchesYear && matchesStatus
    })
  }, [orderedSubmissions, search, studentGradeById, submissionStatusFilter, submissionYearFilter])

  const filteredAssignments = useMemo(() => {
    const query = search.toLowerCase().trim()
    const sortedAssignments = [...adminAssignments].sort(
      (first, second) => new Date(first.deadline).getTime() - new Date(second.deadline).getTime()
    )
    const matchedAssignmentIds = new Set(filteredSubmissions.map((submission) => submission.assignmentId))
    const now = new Date().getTime()
    const threeDays = 1000 * 60 * 60 * 24 * 3

    return sortedAssignments.filter((assignment) => {
      const deadline = new Date(assignment.deadline).getTime()
      const matchesQuery = !query || (
        assignment.title.toLowerCase().includes(query) ||
        assignment.subject.toLowerCase().includes(query) ||
        assignment.description.toLowerCase().includes(query) ||
        assignment.className.toLowerCase().includes(query) ||
        matchedAssignmentIds.has(assignment.id)
      )
      const matchesYear = assignmentYearFilter === 'all' || normalizeAcademicYear(assignment.className) === assignmentYearFilter
      const matchesSubject = assignmentSubjectFilter === 'all' || assignment.subject === assignmentSubjectFilter
      const matchesStatus =
        assignmentStatusFilter === 'all' ||
        (assignmentStatusFilter === 'active' && deadline >= now) ||
        (assignmentStatusFilter === 'closed' && deadline < now) ||
        (assignmentStatusFilter === 'dueSoon' && deadline >= now && deadline - now <= threeDays)

      return matchesQuery && matchesYear && matchesSubject && matchesStatus
    })
  }, [adminAssignments, assignmentStatusFilter, assignmentSubjectFilter, assignmentYearFilter, filteredSubmissions, search])

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

  const plannerAssignments = useMemo(() => {
    const now = new Date().getTime()
    return filteredAssignments
      .filter((assignment) => new Date(assignment.deadline).getTime() >= now)
      .slice(0, 4)
  }, [filteredAssignments])

  const cohortWorkload = useMemo(() => {
    const grouped = filteredAssignments.reduce<Record<string, { total: number; dueSoon: number; pendingReview: number }>>((collection, assignment) => {
      const key = normalizeAcademicYear(assignment.className) || 'UNASSIGNED'
      if (!collection[key]) collection[key] = { total: 0, dueSoon: 0, pendingReview: 0 }
      collection[key].total += 1
      const deadline = new Date(assignment.deadline).getTime()
      const now = Date.now()
      if (deadline >= now && deadline - now <= 1000 * 60 * 60 * 24 * 3) {
        collection[key].dueSoon += 1
      }
      collection[key].pendingReview += submissions.filter((submission) => submission.assignmentId === assignment.id && submission.status !== 'graded').length
      return collection
    }, {})

    return Object.entries(grouped)
      .sort((first, second) => second[1].pendingReview - first[1].pendingReview || second[1].total - first[1].total)
      .slice(0, 4)
  }, [filteredAssignments, submissions])

  const openCreate = () => {
    setEditing(null)
    setQuestionFileName(null)
    setQuestionFileContent(null)
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

  const closeModal = () => {
    setEditing(null)
    setModalOpen(false)
    setQuestionFileName(null)
    setQuestionFileContent(null)
    reset()
  }

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
      deadline: assignment.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
    })
    setModalOpen(true)
  }

  const useAsTemplate = (assignment: AssignmentItem) => {
    setEditing(null)
    setQuestionFileName(assignment.questionFileName ?? null)
    setQuestionFileContent(assignment.questionFileContent ?? null)
    reset({
      title: `${assignment.title} Copy`,
      subject: assignment.subject,
      className: assignment.className,
      description: assignment.description,
      totalMarks: assignment.totalMarks,
      deadline: '',
    })
    setModalOpen(true)
  }

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return
    try {
      await deleteAssignment(assignmentToDelete.id)
      addToast('Assignment deleted', 'success')
      setAssignmentToDelete(null)
    } catch (error) {
      console.error('[Assignments] Failed to delete assignment:', error)
      addToast('Failed to delete assignment', 'error')
    }
  }

  const onSubmit = async (data: AssignmentFormData) => {
    const payload = {
      ...data,
      totalMarks: Number(data.totalMarks),
      deadline: new Date(data.deadline).toISOString().slice(0, 19),
      questionFileName: questionFileName ?? undefined,
      questionFileContent: questionFileContent ?? undefined,
    }

    try {
      if (editing) {
        await updateAssignment(editing.id, payload)
        addToast('Assignment updated', 'success')
      } else {
        await createAssignment(payload)
        addToast('Assignment created', 'success')
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
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Due In 3 Days</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{dueSoonCount}</p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-400">
              <Clock3 size={18} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Late Submissions</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{lateSubmissionCount}</p>
            </div>
            <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Grading Progress</p>
              <p className="mt-2 text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">{gradingCompletionRate}%</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCheck size={18} />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Admin Planner</h3>
              <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
                Quick actions for upcoming work, edits, and cleanup.
              </p>
            </div>
            <Badge label={`${plannerAssignments.length} upcoming`} variant="info" />
          </div>
          <div className="mt-5 grid gap-3">
            {plannerAssignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-light-border p-5 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                No upcoming assignments match the current filters.
              </div>
            ) : plannerAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-light-border bg-white/40 p-4 dark:border-dark-border dark:bg-dark-card2/40">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{assignment.title}</p>
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      {assignment.subject} · {formatClassLabel(assignment.className)} · Due {formatDateTime(assignment.deadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(assignment)} className="btn-ghost px-3 py-2 text-xs">
                      <Edit3 size={13} /> Edit
                    </button>
                    <button type="button" onClick={() => useAsTemplate(assignment)} className="btn-ghost px-3 py-2 text-xs">
                      <Copy size={13} /> Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentToDelete(assignment)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div>
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Cohort Review Queue</h3>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Which B.Tech cohorts need the most grading attention right now.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {cohortWorkload.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-light-border p-5 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
                Cohort workload will appear once assignments are available.
              </div>
            ) : cohortWorkload.map(([cohort, stats]) => (
              <div key={cohort} className="rounded-2xl border border-light-border bg-white/40 p-4 dark:border-dark-border dark:bg-dark-card2/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">
                      {cohort === 'UNASSIGNED' ? 'Unassigned' : formatAcademicYearLabel(cohort)}
                    </p>
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      {stats.total} assignment{stats.total === 1 ? '' : 's'} · {stats.pendingReview} awaiting review
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge label={`${stats.dueSoon} due soon`} variant={stats.dueSoon > 0 ? 'warning' : 'info'} />
                    <Badge label={`${stats.pendingReview} review`} variant={stats.pendingReview > 0 ? 'danger' : 'success'} />
                  </div>
                </div>
              </div>
            ))}
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
                placeholder="Search by title, subject, cohort, learner..."
                className="form-input pl-9"
              />
            </div>
            <div className="rounded-2xl border border-light-border px-3 py-2 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
              {filteredAssignments.length} of {adminAssignments.length} assignments
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={assignmentYearFilter} onChange={(event) => setAssignmentYearFilter(event.target.value)} className="form-input">
            <option value="all">All cohorts</option>
            {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={assignmentSubjectFilter} onChange={(event) => setAssignmentSubjectFilter(event.target.value)} className="form-input">
            <option value="all">All subjects</option>
            {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select value={assignmentStatusFilter} onChange={(event) => setAssignmentStatusFilter(event.target.value as 'all' | 'active' | 'closed' | 'dueSoon')} className="form-input">
            <option value="all">All deadlines</option>
            <option value="active">Active only</option>
            <option value="dueSoon">Due in 3 days</option>
            <option value="closed">Closed only</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setAssignmentYearFilter('all')
              setAssignmentSubjectFilter('all')
              setAssignmentStatusFilter('all')
              setSubmissionStatusFilter('all')
              setSubmissionYearFilter('all')
              setSearch('')
            }}
            className="btn-ghost justify-center"
          >
            Reset Filters
          </button>
        </div>
      </GlassCard>

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
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          navigate(
                            `/assessments/subject?class=${encodeURIComponent(group.className)}&subject=${encodeURIComponent(subjectGroup.subject)}`
                          )
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 bg-white/35 px-4 py-3 text-left transition-colors hover:bg-indigo-500/5 dark:bg-dark-card2/35 dark:hover:bg-indigo-500/10"
                      >
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
                          <ChevronDown size={16} className="-rotate-90 text-light-ink-muted dark:text-dark-ink-muted" />
                      </button>
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
            <h3 className="text-base font-semibold text-light-ink-primary dark:text-dark-ink-primary">Learner Submissions</h3>
            <p className="mt-1 text-sm text-light-ink-muted dark:text-dark-ink-muted">
              Recent work appears first, and ungraded items stay ahead of completed reviews.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={`${filteredSubmissions.filter((submission) => submission.status !== 'graded').length} to review`} variant="warning" />
            <Badge label={`${filteredSubmissions.filter((submission) => submission.status === 'graded').length} graded`} variant="success" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-light-border px-5 py-4 dark:border-dark-border md:grid-cols-2 xl:grid-cols-3">
          <select value={submissionYearFilter} onChange={(event) => setSubmissionYearFilter(event.target.value)} className="form-input">
            <option value="all">All learner cohorts</option>
            {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={submissionStatusFilter} onChange={(event) => setSubmissionStatusFilter(event.target.value as 'all' | 'toReview' | 'graded' | 'late')} className="form-input">
            <option value="all">All review states</option>
            <option value="toReview">Needs review</option>
            <option value="graded">Graded</option>
            <option value="late">Late submissions</option>
          </select>
          <div className="rounded-2xl border border-light-border px-3 py-2 text-sm text-light-ink-muted dark:border-dark-border dark:text-dark-ink-muted">
            {filteredSubmissions.length} visible submissions
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Learner', 'Assignment', 'Submitted Work', 'Status', 'Marks', 'Save'].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-light-ink-muted dark:text-dark-ink-muted">
                    No learner submissions found.
                  </td>
                </tr>
              ) : filteredSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <p className="font-semibold text-light-ink-primary dark:text-dark-ink-primary">{submission.studentName}</p>
                    <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{submission.studentEmail}</p>
                    <p className="mt-1 text-xs text-light-ink-muted dark:text-dark-ink-muted">
                      {formatClassLabel(studentGradeById[submission.studentId])}
                    </p>
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Academic Year</label>
            <select {...register('className', { required: true })} className="form-input">
              <option value="">Select B.Tech year</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.className && <p className="text-xs text-red-400 mt-1">Academic year is required.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Description</label>
            <textarea {...register('description', { required: true })} rows={5} className="form-input resize-none" />
            {errors.description && <p className="text-xs text-red-400 mt-1">Description is required.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">Question File</label>
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
                  console.error('[Assignments] Failed to read question file:', error)
                  addToast('Failed to read question file', 'error')
                  setQuestionFileName(null)
                  setQuestionFileContent(null)
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

      <Modal
        open={Boolean(assignmentToDelete)}
        onClose={() => setAssignmentToDelete(null)}
        title="Delete Assignment"
      >
        <div className="space-y-4">
          <p className="text-sm text-light-ink-secondary dark:text-dark-ink-secondary">
            Delete <span className="font-semibold">{assignmentToDelete?.title}</span> for {assignmentToDelete ? formatClassLabel(assignmentToDelete.className) : 'this cohort'}?
          </p>
          <div className="rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-600">
            This will also remove related submissions from the current admin view.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignmentToDelete(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAssignment}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
            >
              <Trash2 size={14} /> Delete Assignment
            </button>
          </div>
        </div>
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
  const { addToast } = useUIStore()
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
    const studentClass = normalizeAcademicYear(user?.grade)
    const classMatchedAssignments = studentAssignments.filter((assignment) => {
      const assignmentClass = normalizeAcademicYear(assignment.className)
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
      } else {
        await submitAssignment(payload)
        addToast('Assignment submitted', 'success')
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

                    {assignment.questionFileName && assignment.questionFileContent && (
                      <a
                        href={assignment.questionFileContent}
                        download={assignment.questionFileName}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        <FileText size={13} /> {assignment.questionFileName}
                      </a>
                    )}

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
