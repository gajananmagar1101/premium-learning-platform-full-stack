import { useState, useMemo, useEffect } from 'react'
import { Download, FileSpreadsheet, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { AdminSubmission, AssignmentItem, Student, Quiz, QuizAttempt } from '@/types'

interface ExportReportModalProps {
  isOpen: boolean
  onClose: () => void
  submissions: AdminSubmission[]
  assignments: AssignmentItem[]
  quizzes: Quiz[]
  quizAttempts: QuizAttempt[]
  students: Student[]
}

type ReportType = 'graded' | 'pending' | 'quiz_submitted' | 'quiz_pending'

export function ExportReportModal({ isOpen, onClose, submissions, assignments, quizzes, quizAttempts, students }: ExportReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('graded')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [cohortFilter, setCohortFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const subjects = useMemo(() => {
    const list = new Set<string>()
    assignments.forEach(a => {
      if (cohortFilter === 'All' || a.className === cohortFilter) list.add(a.subject)
    })
    submissions.forEach(s => {
      const student = students.find(stu => stu.id === s.studentId || stu._id === s.studentId)
      if (cohortFilter === 'All' || student?.grade === cohortFilter) list.add(s.subject)
    })
    quizzes.forEach(q => {
      if (cohortFilter === 'All' || q.className === cohortFilter) list.add(q.subject)
    })
    return ['All', ...Array.from(list).sort()]
  }, [assignments, submissions, quizzes, cohortFilter, students])

  useEffect(() => {
    if (subjectFilter !== 'All' && !subjects.includes(subjectFilter)) {
      setSubjectFilter('All')
    }
  }, [subjects, subjectFilter])

  const cohorts = useMemo(() => {
    const list = new Set<string>()
    students.forEach(s => s.grade && list.add(s.grade))
    assignments.forEach(a => a.className && list.add(a.className))
    quizzes.forEach(q => q.className && list.add(q.className))
    return ['All', ...Array.from(list).sort()]
  }, [students, assignments, quizzes])

  const handleExport = () => {
    let csvContent = ''

    if (reportType === 'graded') {
      let filtered = submissions

      if (subjectFilter !== 'All') {
        filtered = filtered.filter(s => s.subject === subjectFilter)
      }

      if (cohortFilter !== 'All') {
        filtered = filtered.filter(s => {
          const student = students.find(stu => stu.id === s.studentId || stu._id === s.studentId)
          return student?.grade === cohortFilter
        })
      }

      if (fromDate) {
        const from = new Date(fromDate).getTime()
        filtered = filtered.filter(s => new Date(s.submittedAt).getTime() >= from)
      }
      if (toDate) {
        // Include the entire toDate
        const to = new Date(toDate).getTime() + 86400000 - 1
        filtered = filtered.filter(s => new Date(s.submittedAt).getTime() <= to)
      }

      const lines = [
        ['Learner', 'Cohort', 'Assignment', 'Subject', 'Marks', 'Total Marks', 'Status', 'Submitted At'],
        ...filtered.map((s) => {
          const student = students.find(stu => stu.id === s.studentId || stu._id === s.studentId)
          return [
            s.studentName,
            student?.grade ?? '-',
            s.assignmentTitle,
            s.subject,
            String(s.marks ?? ''),
            String(s.totalMarks),
            s.status,
            new Date(s.submittedAt).toLocaleString(),
          ]
        }),
      ]
      csvContent = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    } else if (reportType === 'pending') {
      // Pending Assignments Logic
      let filteredAssignments = assignments

      if (subjectFilter !== 'All') {
        filteredAssignments = filteredAssignments.filter(a => a.subject === subjectFilter)
      }

      if (cohortFilter !== 'All') {
        filteredAssignments = filteredAssignments.filter(a => a.className === cohortFilter)
      }

      if (fromDate) {
        const from = new Date(fromDate).getTime()
        filteredAssignments = filteredAssignments.filter(a => new Date(a.deadline).getTime() >= from)
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 86400000 - 1
        filteredAssignments = filteredAssignments.filter(a => new Date(a.deadline).getTime() <= to)
      }

      const lines = [
        ['Learner', 'Cohort', 'Assignment', 'Subject', 'Deadline', 'Status']
      ]

      filteredAssignments.forEach(assignment => {
        // Students who belong to this assignment's cohort
        const cohortStudents = students.filter(stu => stu.grade === assignment.className)
        
        cohortStudents.forEach(student => {
          const hasSubmitted = submissions.some(sub => 
            sub.assignmentId === assignment.id && 
            (sub.studentId === student.id || sub.studentId === student._id)
          )

          if (!hasSubmitted) {
            lines.push([
              student.name,
              student.grade,
              assignment.title,
              assignment.subject,
              new Date(assignment.deadline).toLocaleString(),
              'Pending'
            ])
          }
        })
      })

      csvContent = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    } else if (reportType === 'quiz_submitted') {
      let filtered = quizAttempts

      // Need to find subject from quiz
      if (subjectFilter !== 'All') {
        filtered = filtered.filter(qa => {
          const quiz = quizzes.find(q => q.id === qa.quizId)
          return quiz?.subject === subjectFilter
        })
      }

      if (cohortFilter !== 'All') {
        filtered = filtered.filter(qa => qa.className === cohortFilter)
      }

      if (fromDate) {
        const from = new Date(fromDate).getTime()
        filtered = filtered.filter(qa => new Date(qa.submittedAt).getTime() >= from)
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 86400000 - 1
        filtered = filtered.filter(qa => new Date(qa.submittedAt).getTime() <= to)
      }

      const lines = [
        ['Learner', 'Cohort', 'Quiz', 'Subject', 'Score', 'Total Points', 'Submitted At']
      ]
      
      filtered.forEach((qa) => {
        const quiz = quizzes.find(q => q.id === qa.quizId)
        lines.push([
          qa.studentName,
          qa.className,
          quiz?.title ?? 'Unknown Quiz',
          quiz?.subject ?? 'Unknown Subject',
          String(qa.score),
          String(qa.totalPoints),
          new Date(qa.submittedAt).toLocaleString()
        ])
      })
      
      csvContent = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    } else if (reportType === 'quiz_pending') {
      let filteredQuizzes = quizzes

      if (subjectFilter !== 'All') {
        filteredQuizzes = filteredQuizzes.filter(q => q.subject === subjectFilter)
      }

      if (cohortFilter !== 'All') {
        filteredQuizzes = filteredQuizzes.filter(q => q.className === cohortFilter)
      }

      if (fromDate) {
        const from = new Date(fromDate).getTime()
        filteredQuizzes = filteredQuizzes.filter(q => q.deadlineAt && new Date(q.deadlineAt).getTime() >= from)
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 86400000 - 1
        filteredQuizzes = filteredQuizzes.filter(q => q.deadlineAt && new Date(q.deadlineAt).getTime() <= to)
      }

      const lines = [
        ['Learner', 'Cohort', 'Quiz', 'Subject', 'Deadline', 'Status']
      ]

      filteredQuizzes.forEach(quiz => {
        const cohortStudents = students.filter(stu => stu.grade === quiz.className)
        
        cohortStudents.forEach(student => {
          const hasAttempted = quizAttempts.some(qa => 
            qa.quizId === quiz.id && 
            (qa.studentId === student.id || qa.studentId === student._id)
          )

          if (!hasAttempted) {
            lines.push([
              student.name,
              student.grade,
              quiz.title,
              quiz.subject,
              quiz.deadlineAt ? new Date(quiz.deadlineAt).toLocaleString() : 'No Deadline',
              'Pending'
            ])
          }
        })
      })

      csvContent = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    }

    if (!csvContent) return

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report_${reportType}_${new Date().getTime()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Export Custom Report">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Report Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setReportType('graded')}
              className={`px-2 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                reportType === 'graded' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Assignments Submitted
            </button>
            <button
              onClick={() => setReportType('pending')}
              className={`px-2 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                reportType === 'pending' 
                  ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' 
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Assignments Pending
            </button>
            <button
              onClick={() => setReportType('quiz_submitted')}
              className={`px-2 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                reportType === 'quiz_submitted' 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' 
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Quizzes Submitted
            </button>
            <button
              onClick={() => setReportType('quiz_pending')}
              className={`px-2 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                reportType === 'quiz_pending' 
                  ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' 
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Quizzes Pending
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cohort / Year
            </label>
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              {cohorts.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileSpreadsheet size={16} />
            Download CSV
          </button>
        </div>
      </div>
    </Modal>
  )
}
