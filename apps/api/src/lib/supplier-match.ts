/**
 * Fuzzy match an extracted merchant string against existing supplier names
 * and aliases. Uses token-set Jaccard similarity (Workers-friendly, no deps).
 *
 * Returns the highest-scoring supplier, or null if none clears the threshold.
 */

export type SupplierCandidate = {
  id: string
  name: string
  aliases: string[]
}

const MATCH_THRESHOLD = 0.7
const STOP_TOKENS = new Set([
  'THE', 'A', 'AND', '&', 'PTY', 'LTD', 'CC', 'INC', 'SA',
  'STORE', 'SHOP', 'TRADING',
])

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_TOKENS.has(t)),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function findBestSupplierMatch(
  candidate: string,
  suppliers: SupplierCandidate[],
): { supplier: SupplierCandidate; score: number } | null {
  const candTokens = tokenize(candidate)
  if (candTokens.size === 0) return null

  let best: { supplier: SupplierCandidate; score: number } | null = null
  for (const s of suppliers) {
    const targets = [s.name, ...s.aliases]
    for (const t of targets) {
      const tokens = tokenize(t)
      const score = jaccard(candTokens, tokens)
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { supplier: s, score }
      }
    }
  }
  return best
}
