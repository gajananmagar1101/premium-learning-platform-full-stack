const crypto = require('crypto')

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

  return { token, tokenHash, expiresAt }
}

function hashEmailVerificationToken(token = '') {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

module.exports = {
  EMAIL_VERIFICATION_TTL_MS,
  createEmailVerificationToken,
  hashEmailVerificationToken,
}
