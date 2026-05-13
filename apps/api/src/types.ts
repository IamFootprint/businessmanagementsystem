import type { UserRole } from '@bms/db'

export type SessionUser = {
  id: string
  tenantId: string
  email: string
  name: string
  role: UserRole
  active: boolean
}

export type AppEnv = {
  Variables: {
    user: SessionUser
  }
}
