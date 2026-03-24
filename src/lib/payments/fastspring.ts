import crypto from 'crypto'
import type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookResult } from './provider'

const API_USER = process.env.FASTSPRING_API_USER ?? ''
const API_PASSWORD = process.env.FASTSPRING_API_PASSWORD ?? ''
// Webhook HMAC secret — hex-encoded 32-byte key from FastSpring dashboard
const WEBHOOK_SECRET = process.env.FASTSPRING_WEBHOOK_SECRET ?? ''

// FastSpring product path IDs — must match catalogue in FastSpring dashboard
const PRODUCT_MAP: Record<string, string> = {
  starter: process.env.FASTSPRING_PRODUCT_STARTER ?? 'starter',
  pro: process.env.FASTSPRING_PRODUCT_PRO ?? 'pro',
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${API_USER}:${API_PASSWORD}`).toString('base64')
}

export class FastSpringAdapter implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    if (!API_USER || !API_PASSWORD) throw new Error('FASTSPRING_API_USER / FASTSPRING_API_PASSWORD not set')

    // Derive a product from amountCents as a fallback — callers should set
    // the product via metadata. For now, we pass amountCents as a custom tag.
    const res = await fetch('https://api.fastspring.com/sessions', {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ product: PRODUCT_MAP['starter'] ?? 'starter', quantity: 1 }],
        tags: {
          invoiceId: params.invoiceId,
          shopId: params.shopId,
          amountCents: String(params.amountCents),
          currency: params.currency,
        },
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        reset: true,
        language: 'en',
      }),
    })

    if (!res.ok) throw new Error(`FastSpring session creation failed: ${res.status}`)
    const data = await res.json()
    const url = data?.url
    if (!url) throw new Error('FastSpring did not return a session URL')

    return { checkoutUrl: url, providerReference: data?.id ?? '' }
  }

  async handleWebhook(payload: Buffer, headers: Record<string, string>): Promise<WebhookResult> {
    const sig = headers['x-security-data'] ?? ''
    if (!WEBHOOK_SECRET) throw new Error('FASTSPRING_WEBHOOK_SECRET not set')

    // Secret is hex-encoded; decode to raw bytes before computing HMAC
    let secretBytes: Buffer
    try {
      secretBytes = Buffer.from(WEBHOOK_SECRET, 'hex')
    } catch {
      secretBytes = Buffer.from(WEBHOOK_SECRET, 'utf8')
    }

    const expectedBuf = crypto.createHmac('sha256', secretBytes).update(payload).digest()
    let receivedBuf: Buffer
    try {
      receivedBuf = Buffer.from(sig, 'base64')
    } catch {
      throw new Error('Invalid FastSpring webhook signature format')
    }

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new Error('Invalid FastSpring webhook signature')
    }

    const body = JSON.parse(payload.toString())
    const events: any[] = body.events ?? [body]
    const event = events[0] ?? {}
    const eventType: string = event.type ?? ''
    const data = event.data ?? {}

    // Map FastSpring events to our WebhookResult shape
    if (eventType === 'subscription.activated' || eventType === 'subscription.payment.completed') {
      const invoiceId = data.tags?.invoiceId ?? ''
      const reference = data.subscription ?? data.id ?? ''
      return { invoiceId, status: 'paid', providerReference: reference }
    }

    if (eventType === 'refund.created') {
      const invoiceId = data.tags?.invoiceId ?? ''
      return { invoiceId, status: 'refunded', providerReference: data.reference ?? '' }
    }

    // Unhandled or informational events
    return { invoiceId: '', status: 'failed', providerReference: '' }
  }
}
