import type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookResult } from './provider'

/**
 * No-op payment adapter for PAYMENT_PROVIDER=none.
 *
 * Used when no PSP has been provisioned yet. All billing routes will
 * return a clear "not configured" error rather than crashing the process.
 */
export class NoopPaymentAdapter implements PaymentProvider {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error('Payment provider not configured (PAYMENT_PROVIDER=none)')
  }

  async handleWebhook(_payload: Buffer, _headers: Record<string, string>): Promise<WebhookResult> {
    throw new Error('Payment provider not configured (PAYMENT_PROVIDER=none)')
  }
}
