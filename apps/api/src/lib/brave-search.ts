/**
 * Tiny Brave Search API client. Cloudflare-Workers-safe — uses fetch only.
 *
 * Free tier: 2,000 queries/month. Key set as a wrangler secret:
 *   echo "<api-key>" | npx wrangler secret put BRAVE_SEARCH_API_KEY
 * Locally, drop the key in apps/api/.dev.vars.
 *
 * Docs: https://api.search.brave.com/app/documentation
 */

const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

export type BraveResult = {
  title: string
  url: string
  description: string
}

export type BraveLookup = {
  query: string
  results: BraveResult[]
  fetchedAt: string
}

// Typed errors so callers can distinguish "the key is broken — stop trying"
// from "this one request hit a rate limit / network blip".
export class BraveAuthError extends Error {
  readonly kind = 'BraveAuthError' as const
}
export class BraveRateLimitError extends Error {
  readonly kind = 'BraveRateLimitError' as const
  constructor(public readonly retryAfterSec: number | null) {
    super('Brave rate limit')
  }
}

export async function braveSearch(query: string, apiKey: string, limit = 3): Promise<BraveLookup> {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&count=${limit}&safesearch=moderate&country=ZA`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (res.status === 401 || res.status === 403) {
    throw new BraveAuthError(`Brave Search returned ${res.status} — check BRAVE_SEARCH_API_KEY`)
  }
  if (res.status === 429) {
    const ra = res.headers.get('Retry-After')
    throw new BraveRateLimitError(ra ? Number(ra) : null)
  }
  if (!res.ok) {
    throw new Error(`Brave Search returned ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  const data = (await res.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> }
  }

  const results: BraveResult[] = (data.web?.results ?? []).slice(0, limit).map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    description: r.description ?? '',
  }))

  return {
    query,
    results,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Pull a probable website from search results. Heuristic: take the first
 * result whose URL is not a directory listing / social media.
 */
export function pickWebsite(lookup: BraveLookup): string | null {
  const social = ['facebook.com', 'linkedin.com', 'instagram.com', 'twitter.com', 'x.com', 'yellowpages', 'showme.co.za', 'hellopeter']
  for (const r of lookup.results) {
    if (!r.url) continue
    try {
      const host = new URL(r.url).hostname.toLowerCase()
      if (social.some((s) => host.includes(s))) continue
      return r.url
    } catch {
      continue
    }
  }
  return null
}
