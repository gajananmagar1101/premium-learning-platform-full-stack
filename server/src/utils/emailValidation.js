const RESERVED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'fake.com',
  'invalid.com',
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  'sharklasers.com',
  '10minutemail.com',
])

const PLACEHOLDER_LOCAL_PARTS = new Set([
  'test',
  'testing',
  'fake',
  'demo',
  'sample',
  'asdf',
  'qwerty',
  'abc',
  'temp',
  'user',
  'username',
  'unknown',
  'none',
  'na',
])

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function isRealisticEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  if (normalized.length > 254) return false
  if (/\s/.test(normalized)) return false

  const parts = normalized.split('@')
  if (parts.length !== 2) return false

  const [localPart, domain] = parts
  if (!localPart || !domain) return false
  if (localPart.length > 64) return false
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false
  if (localPart.includes('..')) return false
  if (!/^[a-z0-9._%+-]+$/i.test(localPart)) return false

  if (domain.length > 253) return false
  if (!domain.includes('.')) return false
  if (domain.includes('..')) return false
  if (!/^[a-z0-9.-]+$/i.test(domain)) return false

  const labels = domain.split('.')
  if (labels.some((label) => !label || label.startsWith('-') || label.endsWith('-') || label.length > 63)) {
    return false
  }

  const tld = labels.at(-1)
  if (!tld || !/^[a-z]{2,24}$/i.test(tld)) return false
  if (RESERVED_DOMAINS.has(domain)) return false
  if (PLACEHOLDER_LOCAL_PARTS.has(localPart)) return false

  return true
}

function getEmailValidationMessage() {
  return 'Enter a valid personal or school email address.'
}

module.exports = {
  getEmailValidationMessage,
  isRealisticEmail,
  normalizeEmail,
}
