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
  Bindings: {
    DATABASE_URL: string
    BLOB_READ_WRITE_TOKEN?: string
    OPENAI_API_KEY?: string
    BRAVE_SEARCH_API_KEY?: string
  }
  Variables: {
    user: SessionUser
    sessionId: string
  }
}
