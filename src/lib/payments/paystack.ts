import crypto from 'crypto'
import type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookResult } from './provider'

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? ''
const PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY ?? ''

export class PaystackAdapter implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    if (!SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY not set')

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency,
        metadata: { invoiceId: params.invoiceId, shopId: params.shopId },
        callback_url: params.successUrl,
      }),
    })

    if (!res.ok) throw new Error(`Paystack checkout failed: ${res.status}`)
    const data = await res.json()
    return {
      checkoutUrl: data.data.authorization_url,
      providerReference: data.data.reference,
    }
  }

  async handleWebhook(payload: Buffer, headers: Record<string, string>): Promise<WebhookResult> {
    const sig = headers['x-paystack-signature'] ?? ''
    const expected = crypto.createHmac('sha512', SECRET_KEY).update(payload).digest('hex')

    if (sig.length !== expected.length) throw new Error('Invalid Paystack webhook signature')
    try {
      if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) {
        throw new Error('Invalid Paystack webhook signature')
      }
    } catch {
      throw new Error('Invalid Paystack webhook signature')
    }

    const event = JSON.parse(payload.toString())
    if (event.event !== 'charge.success') {
      return { invoiceId: '', status: 'failed', providerReference: event.data?.reference ?? '' }
    }

    const invoiceId = event.data?.metadata?.invoiceId ?? ''
    return { invoiceId, status: 'paid', providerReference: event.data.reference }
  }
}
