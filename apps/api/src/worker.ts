import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { setPrismaClient } from '@bms/db'
import { createApp } from './app'

type Env = {
  DATABASE_URL: string
  BLOB_READ_WRITE_TOKEN?: string
}

// Workers have native WebSocket — required for Neon's WS-based transactions
neonConfig.webSocketConstructor = WebSocket

let app: ReturnType<typeof createApp> | undefined

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!app) {
      const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })
      setPrismaClient(new PrismaClient({ adapter }))
      app = createApp()
    }
    return app.fetch(request, env)
  },
}
