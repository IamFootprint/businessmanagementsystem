/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare R2 storage helper for receipt photos.
 *
 * R2 is bound to the Worker as RECEIPTS_BUCKET (see wrangler.toml). Files are
 * stored under random keys generated here, and served back to clients via the
 * Worker route `GET /receipts/file/:key` so the bucket can stay private —
 * security via unguessable keys, same model as Vercel Blob's default URLs.
 */

/**
 * Generates a URL-safe key for a freshly uploaded receipt.
 * Format: `<unix-ms>-<24 hex chars>-<safe-filename>`
 * - Time-prefix keeps S3-listing readable for ops.
 * - 24-hex-char nonce gives ~96 bits of entropy → unguessable.
 * - Filename suffix preserves the extension for content-type sniffing.
 */
export function generateReceiptKey(originalFilename: string): string {
  const safeName = originalFilename.replace(/[^\w.\-]/g, '_').slice(0, 128) || 'receipt'
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const hex = Array.from(nonce, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${Date.now()}-${hex}-${safeName}`
}

/**
 * Builds the public-facing URL that clients should embed in <img src=...>.
 * Points at the Worker proxy route, which streams the object out of R2.
 */
export function buildReceiptPublicUrl(key: string, baseUrl?: string): string {
  const base = baseUrl ?? 'https://bms-api.lebogang.workers.dev'
  return `${base}/receipts/file/${encodeURIComponent(key)}`
}

/**
 * Uploads bytes to R2 and returns the storage key + the public Worker-proxy URL.
 */
export async function putReceipt(
  bucket: R2Bucket,
  originalFilename: string,
  body: ArrayBuffer | ReadableStream | Blob,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const key = generateReceiptKey(originalFilename)
  await bucket.put(key, body as ArrayBuffer, {
    httpMetadata: { contentType },
  })
  return { key, url: buildReceiptPublicUrl(key) }
}
