import bcrypt from 'bcryptjs'

const ROUNDS = 12

// Pre-computed so bcrypt never runs at module init (required for Cloudflare Workers).
export const DUMMY_HASH = '$2b$12$4VNsDQqmVIt5jBlcKm1g5eL1BQX8nUFFZoU8eKDXEejplHbp03ltO'

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS)
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}
