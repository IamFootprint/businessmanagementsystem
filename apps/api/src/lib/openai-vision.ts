/**
 * Tiny OpenAI vision wrapper for receipt OCR. Cloudflare-Workers-safe — fetch only.
 *
 * We use GPT-4o-mini for cost (~$0.0015 per receipt) and reliability. The model
 * returns structured JSON via response_format=json_object so we don't need to
 * parse free-text.
 *
 * Key set as a wrangler secret:
 *   echo "<api-key>" | npx wrangler secret put OPENAI_API_KEY
 */

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a receipt-data extractor. The user will send a single
photo or scan of a retail receipt. Return a JSON object with these fields:

{
  "merchant": string | null,          // business name as it appears on the receipt
  "merchantAddress": string | null,   // street address line if visible
  "transactionDate": string | null,   // ISO 8601 (YYYY-MM-DD); guess year if only DD/MM is shown, prefer the most recent past year
  "totalAmount": number | null,       // final amount paid, in major units (e.g. 850.00 for R850), positive
  "vatAmount": number | null,         // VAT/tax amount if shown separately, in major units; null if not on receipt
  "currency": string | null,          // ISO 4217 (e.g. "ZAR"); default "ZAR" for South African receipts
  "paymentMethod": string | null,     // "cash", "card", "eft", etc., if visible
  "lineItems": [                      // up to 20 line items if clearly visible; empty array if not legible
    { "description": string, "amount": number }
  ],
  "rawText": string,                  // full plain-text transcription of every legible line on the receipt
  "confidence": "high" | "medium" | "low"  // your confidence in the extracted total + merchant
}

Rules:
- Be strict about the merchant name — return the trading name only, not the
  street address or "Thank you" line.
- If the receipt is too blurry / wrong-language / not a receipt at all, set
  merchant/total to null and confidence to "low".
- South African receipts often show VAT as "VAT 15%" or "TAX 1" — include
  whichever number is the VAT amount (not the rate).
- Never invent fields. Anything you can't read confidently is null.
- Output ONLY the JSON object. No prose, no markdown fences.`

export type ReceiptExtractionResult = {
  merchant: string | null
  merchantAddress: string | null
  transactionDate: string | null
  totalAmount: number | null
  vatAmount: number | null
  currency: string | null
  paymentMethod: string | null
  lineItems: Array<{ description: string; amount: number }>
  rawText: string
  confidence: 'high' | 'medium' | 'low'
}

export async function extractReceipt(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
): Promise<ReceiptExtractionResult> {
  // Convert to base64 data URL for the chat-completions vision input
  const b64 = arrayBufferToBase64(imageBytes)
  const dataUrl = `data:${mimeType};base64,${b64}`

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the structured fields from this receipt.' },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.0,
    max_tokens: 1500,
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (res.status === 401 || res.status === 403) {
      throw new OpenAIAuthError(`OpenAI returned ${res.status}: ${text}`)
    }
    if (res.status === 429) {
      throw new OpenAIRateLimitError(`OpenAI rate limit: ${text}`)
    }
    throw new Error(`OpenAI returned ${res.status}: ${text}`)
  }

  type ChatResp = { choices?: Array<{ message?: { content?: string } }> }
  const data = (await res.json()) as ChatResp
  const content = data.choices?.[0]?.message?.content ?? ''

  let parsed: Partial<ReceiptExtractionResult>
  try {
    parsed = JSON.parse(content) as Partial<ReceiptExtractionResult>
  } catch {
    throw new Error(`OpenAI returned non-JSON content: ${content.slice(0, 200)}`)
  }

  // Normalise with safe defaults.
  return {
    merchant: parsed.merchant ?? null,
    merchantAddress: parsed.merchantAddress ?? null,
    transactionDate: parsed.transactionDate ?? null,
    totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
    vatAmount: typeof parsed.vatAmount === 'number' ? parsed.vatAmount : null,
    currency: parsed.currency ?? 'ZAR',
    paymentMethod: parsed.paymentMethod ?? null,
    lineItems: Array.isArray(parsed.lineItems)
      ? parsed.lineItems.filter((li) => li && typeof li.description === 'string' && typeof li.amount === 'number')
      : [],
    rawText: parsed.rawText ?? '',
    confidence: parsed.confidence ?? 'low',
  }
}

export class OpenAIAuthError extends Error {
  readonly kind = 'OpenAIAuthError' as const
}
export class OpenAIRateLimitError extends Error {
  readonly kind = 'OpenAIRateLimitError' as const
}

// Workers don't have Buffer; use a manual base64 encoder.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
  }
  // btoa is available in Workers' standard global scope.
  return btoa(binary)
}
