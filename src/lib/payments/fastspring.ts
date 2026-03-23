import type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookResult } from './provider'

export class FastSpringAdapter implements PaymentProvider {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error(
      'FastSpring adapter not yet implemented. ' +
      'Set PAYMENT_PROVIDER=fastspring and implement createCheckout once credentials are available. ' +
      'FastSpring is a Merchant of Record — tax and compliance are handled automatically.'
    )
  }

  async handleWebhook(_payload: Buffer, _headers: Record<string, string>): Promise<WebhookResult> {
    throw new Error('FastSpring adapter not yet implemented.')
  }
}
