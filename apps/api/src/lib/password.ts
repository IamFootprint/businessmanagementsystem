import bcrypt from 'bcryptjs'

const ROUNDS = 12

// Computed once at startup so bcrypt.compare always does full work even for missing/inactive users.
export const DUMMY_HASH = bcrypt.hashSync('bms-dummy-constant-password', ROUNDS)

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS)
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}
