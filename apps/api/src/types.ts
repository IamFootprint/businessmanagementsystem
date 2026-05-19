/// <reference types="@cloudflare/workers-types" />
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
    OPENAI_API_KEY?: string
    BRAVE_SEARCH_API_KEY?: string
    // R2 bucket for receipt photo storage. Bound in wrangler.toml.
    RECEIPTS_BUCKET: R2Bucket
    // Legacy Vercel Blob token — kept for back-compat while we migrate. Remove
    // once the last @vercel/blob call is gone.
    BLOB_READ_WRITE_TOKEN?: string
  }
  Variables: {
    user: SessionUser
    sessionId: string
  }
}
