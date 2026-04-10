const normalizeRole = (role) => {
  const normalized = String(role || 'student').trim().toLowerCase()
  return normalized === 'admin' ? 'admin' : 'student'
}

const studentRoleFilter = { $in: ['student', 'STUDENT'] }

module.exports = { normalizeRole, studentRoleFilter }
