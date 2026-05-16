const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

const MAX_RETRIES = 3
const RETRY_BASE_MS = 300

// Status codes that indicate a transient server hiccup (Cloudflare Worker cold
// start, Neon WebSocket reset) — safe to retry idempotently.
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 521, 522, 524])

function shouldRetry(status: number, method?: string): boolean {
  if (!RETRY_STATUS.has(status)) return false
  // Only retry safe methods automatically
  const m = (method ?? 'GET').toUpperCase()
  return m === 'GET' || m === 'HEAD'
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  let lastErr: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: isFormData
          ? { ...(headers as Record<string, string>) }
          : { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
        body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        if (attempt < MAX_RETRIES && shouldRetry(res.status, rest.method)) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)))
          continue
        }
        const error = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error((error as { message?: string }).message ?? res.statusText)
      }

      return res.json() as Promise<T>
    } catch (err) {
      lastErr = err as Error
      // Retry on network errors for safe methods
      const method = (rest.method ?? 'GET').toUpperCase()
      const isNetworkLike = err instanceof TypeError || /fetch failed|network/i.test(lastErr.message ?? '')
      if (attempt < MAX_RETRIES && isNetworkLike && (method === 'GET' || method === 'HEAD')) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)))
        continue
      }
      throw err
    }
  }

  throw lastErr ?? new Error('apiRequest failed after retries')
}
