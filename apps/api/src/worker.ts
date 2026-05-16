import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { withPrisma } from '@bms/db'
import { createApp } from './app'

type Env = {
  DATABASE_URL: string
  BLOB_READ_WRITE_TOKEN?: string
}

// Workers have native WebSocket — required for Neon's WS-based transactions
neonConfig.webSocketConstructor = WebSocket

// The Hono app instance can be safely cached across requests — it holds no I/O.
// The PrismaClient cannot, so it's created per request below.
let cachedApp: ReturnType<typeof createApp> | undefined

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!cachedApp) {
      cachedApp = createApp()
    }

    // Create a fresh PrismaClient for this request.
    // The Neon WebSocket inside it is bound to THIS request's I/O context;
    // Cloudflare's runtime would reject any attempt to reuse it across requests.
    const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })
    const client = new PrismaClient({ adapter })

    try {
      return await withPrisma(client, () => cachedApp!.fetch(request, env))
    } finally {
      // Don't await — disconnect at our leisure, the Worker may already be done
      client.$disconnect().catch(() => undefined)
    }
  },
}
