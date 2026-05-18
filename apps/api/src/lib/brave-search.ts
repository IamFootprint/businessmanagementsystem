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

export async function braveSearch(query: string, apiKey: string, limit = 3): Promise<BraveLookup> {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&count=${limit}&safesearch=moderate&country=ZA`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

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
