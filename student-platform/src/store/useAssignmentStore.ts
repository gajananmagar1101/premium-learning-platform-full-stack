import { create } from 'zustand/react'
import type { AdminSubmission, AssignmentItem, AssignmentSubmission, StudentAssignmentItem } from '@/types'
import { adminAssignmentAPI, studentAssignmentAPI, submissionAPI } from '@/lib/services'

type AssignmentPayload = Omit<AssignmentItem, 'id' | '_id' | 'createdAt' | 'publicationStatus'> & {
  status: 'draft' | 'published'
}

interface AssignmentStoreState {
  adminAssignments: AssignmentItem[]
  studentAssignments: StudentAssignmentItem[]
  submissions: AdminSubmission[]
  adminAssignmentsLoaded: boolean
  studentAssignmentsLoaded: boolean
  submissionsLoaded: boolean
  loading: boolean
  fetchAdminAssignments: () => Promise<void>
  fetchStudentAssignments: () => Promise<void>
  fetchAdminSubmissions: () => Promise<void>
  createAssignment: (data: AssignmentPayload) => Promise<void>
  updateAssignment: (id: string, data: AssignmentPayload) => Promise<void>
  publishAssignment: (id: string) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>
  submitAssignment: (data: { assignmentId: string; content?: string; fileName?: string; fileContent?: string }) => Promise<void>
  updateSubmission: (id: string, data: { assignmentId: string; content?: string; fileName?: string; fileContent?: string }) => Promise<void>
  gradeSubmission: (id: string, marks: number) => Promise<void>
}

const normalizeAssignment = (assignment: AssignmentItem & { _id?: string; id?: string; status?: string }): AssignmentItem => ({
  ...assignment,
  id: assignment._id ?? assignment.id ?? '',
  publicationStatus: assignment.publicationStatus ?? (assignment.status === 'published' ? 'published' : 'draft'),
})

const normalizeSubmission = <T extends { _id?: string; id?: string }>(submission: T): T & { id: string } => ({
  ...submission,
  id: submission._id ?? submission.id ?? '',
})

const normalizeStudentAssignment = (assignment: StudentAssignmentItem & { _id?: string; submission?: AssignmentSubmission | null }) => ({
  ...normalizeAssignment(assignment),
  submission: assignment.submission ? normalizeSubmission(assignment.submission) : null,
})

const normalizeAssignmentSubmission = (submission: AssignmentSubmission & { _id?: string; id?: string }): AssignmentSubmission => (
  normalizeSubmission(submission)
)

let adminAssignmentsRequest: Promise<void> | null = null
let studentAssignmentsRequest: Promise<void> | null = null
let adminSubmissionsRequest: Promise<void> | null = null

export const useAssignmentStore = create<AssignmentStoreState>((set, get) => ({
  adminAssignments: [],
  studentAssignments: [],
  submissions: [],
  adminAssignmentsLoaded: false,
  studentAssignmentsLoaded: false,
  submissionsLoaded: false,
  loading: false,

  fetchAdminAssignments: async () => {
    if (adminAssignmentsRequest) {
      return adminAssignmentsRequest
    }

    if (!get().adminAssignmentsLoaded) {
      set({ loading: true })
    }
    adminAssignmentsRequest = adminAssignmentAPI.getAll()
      .then((res) => {
        set({
          adminAssignments: (res.data.assignments ?? []).map((assignment: AssignmentItem) => normalizeAssignment(assignment)),
          adminAssignmentsLoaded: true,
          loading: false,
        })
      })
      .catch((error) => {
        console.error('[AssignmentStore] Failed to fetch admin assignments:', error)
        set({ loading: false })
      })
      .finally(() => {
        adminAssignmentsRequest = null
      })

    return adminAssignmentsRequest
  },

  fetchStudentAssignments: async () => {
    if (studentAssignmentsRequest) {
      return studentAssignmentsRequest
    }

    if (!get().studentAssignmentsLoaded) {
      set({ loading: true })
    }
    studentAssignmentsRequest = studentAssignmentAPI.getAll()
      .then((res) => {
        set({
          studentAssignments: (res.data.assignments ?? []).map((assignment: StudentAssignmentItem) => normalizeStudentAssignment(assignment)),
          studentAssignmentsLoaded: true,
          loading: false,
        })
      })
      .catch((error) => {
        console.error('[AssignmentStore] Failed to fetch student assignments:', error)
        set({ loading: false })
      })
      .finally(() => {
        studentAssignmentsRequest = null
      })

    return studentAssignmentsRequest
  },

  fetchAdminSubmissions: async () => {
    if (adminSubmissionsRequest) {
      return adminSubmissionsRequest
    }

    adminSubmissionsRequest = submissionAPI.getAllForAdmin()
      .then((res) => {
        set({
          submissions: (res.data.submissions ?? []).map((submission: AdminSubmission) => normalizeSubmission(submission)),
          submissionsLoaded: true,
        })
      })
      .catch((error) => {
        console.error('[AssignmentStore] Failed to fetch admin submissions:', error)
      })
      .finally(() => {
        adminSubmissionsRequest = null
      })

    return adminSubmissionsRequest
  },

  createAssignment: async (data) => {
    const tempId = `temp-${Date.now()}`
    const tempAssignment: AssignmentItem = {
      ...data,
      id: tempId,
      _id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publicationStatus: data.status,
    } as unknown as AssignmentItem

    set((state) => ({
      adminAssignments: [tempAssignment, ...state.adminAssignments],
      adminAssignmentsLoaded: true,
    }))

    try {
      const res = await adminAssignmentAPI.create(data)
      const assignment = normalizeAssignment(res.data.assignment)
      set((state) => ({
        adminAssignments: state.adminAssignments.map(a => a.id === tempId ? assignment : a),
      }))
    } catch (error) {
      set((state) => ({
        adminAssignments: state.adminAssignments.filter(a => a.id !== tempId),
      }))
      throw error
    }
  },

  updateAssignment: async (id, data) => {
    const previousAssignments = get().adminAssignments
    set((state) => ({
      adminAssignments: state.adminAssignments.map((item) => 
        item.id === id ? { ...item, ...data, publicationStatus: data.status } as AssignmentItem : item
      ),
    }))

    try {
      const res = await adminAssignmentAPI.update(id, data)
      const assignment = normalizeAssignment(res.data.assignment)
      set((state) => ({
        adminAssignments: state.adminAssignments.map((item) => item.id === id ? assignment : item),
      }))
    } catch (error) {
      set({ adminAssignments: previousAssignments })
      throw error
    }
  },

  publishAssignment: async (id) => {
    const previousAssignments = get().adminAssignments
    set((state) => ({
      adminAssignments: state.adminAssignments.map((item) => 
        item.id === id ? { ...item, publicationStatus: 'published', status: 'published' } : item
      ),
    }))

    try {
      const res = await adminAssignmentAPI.publish(id)
      const assignment = normalizeAssignment(res.data.assignment)
      set((state) => ({
        adminAssignments: state.adminAssignments.map((item) => item.id === id ? assignment : item),
      }))
    } catch (error) {
      set({ adminAssignments: previousAssignments })
      throw error
    }
  },

  deleteAssignment: async (id) => {
    const previousAssignments = get().adminAssignments
    const previousSubmissions = get().submissions
    set((state) => ({
      adminAssignments: state.adminAssignments.filter((item) => item.id !== id),
      submissions: state.submissions.filter((submission) => submission.assignmentId !== id),
    }))

    try {
      await adminAssignmentAPI.delete(id)
    } catch (error) {
      set({ 
        adminAssignments: previousAssignments,
        submissions: previousSubmissions 
      })
      throw error
    }
  },

  submitAssignment: async (data) => {
    const previousAssignments = get().studentAssignments
    set((state) => ({
      studentAssignments: state.studentAssignments.map((assignment) => (
        assignment.id === data.assignmentId
          ? {
              ...assignment,
              status: 'submitted',
              canSubmit: false,
              submission: { id: `temp-${Date.now()}`, assignmentId: data.assignmentId, studentId: 'temp', status: 'submitted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as AssignmentSubmission,
            }
          : assignment
      )),
    }))

    try {
      const res = await submissionAPI.create(data)
      const submission = normalizeAssignmentSubmission(res.data.submission)
      set((state) => ({
        studentAssignments: state.studentAssignments.map((assignment) => (
          assignment.id === data.assignmentId
            ? {
                ...assignment,
                status: submission.status,
                canSubmit: false,
                canEdit: !assignment.submissionClosed,
                submission,
              }
            : assignment
        )),
      }))
    } catch (error) {
      set({ studentAssignments: previousAssignments })
      throw error
    }
  },

  updateSubmission: async (id, data) => {
    const previousAssignments = get().studentAssignments
    set((state) => ({
      studentAssignments: state.studentAssignments.map((assignment) => (
        assignment.id === data.assignmentId
          ? {
              ...assignment,
              submission: { ...assignment.submission, ...data } as unknown as AssignmentSubmission,
            }
          : assignment
      )),
    }))

    try {
      const res = await submissionAPI.update(id, data)
      const submission = normalizeAssignmentSubmission(res.data.submission)
      set((state) => ({
        studentAssignments: state.studentAssignments.map((assignment) => (
          assignment.id === data.assignmentId
            ? {
                ...assignment,
                status: submission.status,
                canSubmit: false,
                canEdit: !assignment.submissionClosed,
                submission,
              }
            : assignment
        )),
      }))
    } catch (error) {
      set({ studentAssignments: previousAssignments })
      throw error
    }
  },

  gradeSubmission: async (id, marks) => {
    const previousSubmissions = get().submissions
    set((state) => ({
      submissions: state.submissions.map((item) => 
        item.id === id ? { ...item, marks, status: 'graded' } : item
      ),
    }))

    try {
      const res = await submissionAPI.grade(id, { marks })
      const submission = normalizeSubmission(res.data.submission)
      set((state) => ({
        submissions: state.submissions.map((item) => item.id === id ? submission : item),
      }))
    } catch (error) {
      set({ submissions: previousSubmissions })
      throw error
    }
  },
}))
