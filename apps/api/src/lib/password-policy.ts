/**
 * Password policy for BMS.
 *
 * Minimum 10 characters. Must contain at least one letter and one digit.
 * Symbols are encouraged but not required. The policy is intentionally
 * modest — operator-facing accounts have a fixed audience (kgolaentle.com
 * staff), so we lean toward "long" rather than "complex" per NIST 800-63B.
 */

export type PasswordPolicyResult = { ok: true } | { ok: false; error: string }

const MIN_LENGTH = 10

export function validatePassword(password: string): PasswordPolicyResult {
  if (typeof password !== 'string') return { ok: false, error: 'Password is required' }
  if (password.length < MIN_LENGTH) return { ok: false, error: `Password must be at least ${MIN_LENGTH} characters` }
  if (password.length > 200) return { ok: false, error: 'Password is too long (max 200 characters)' }
  if (!/[A-Za-z]/.test(password)) return { ok: false, error: 'Password must contain at least one letter' }
  if (!/\d/.test(password)) return { ok: false, error: 'Password must contain at least one digit' }
  if (/^\s|\s$/.test(password)) return { ok: false, error: 'Password cannot start or end with whitespace' }
  return { ok: true }
}
