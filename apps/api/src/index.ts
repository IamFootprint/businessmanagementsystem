import { serve } from '@hono/node-server'
import { createApp } from './app'

const app = createApp()
const port = Number(process.env.API_PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})
