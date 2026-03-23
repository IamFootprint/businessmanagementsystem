import type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookResult } from './provider'

export class PayFastAdapter implements PaymentProvider {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error(
      'PayFast adapter not yet implemented. ' +
      'Set PAYMENT_PROVIDER=payfast and implement createCheckout once credentials are available.'
    )
  }

  async handleWebhook(_payload: Buffer, _headers: Record<string, string>): Promise<WebhookResult> {
    throw new Error('PayFast adapter not yet implemented.')
  }
}
