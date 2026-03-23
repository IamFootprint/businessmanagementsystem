/**
 * PSP-agnostic billing interface.
 *
 * Each payment provider implements this interface. The active provider is
 * selected at runtime via the PAYMENT_PROVIDER environment variable.
 * Supported values: paystack | payfast | fastspring
 */

export interface CheckoutParams {
  shopId: string
  invoiceId: string
  amountCents: number
  currency: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResult {
  checkoutUrl: string
  providerReference: string  // PSP's own transaction/order reference
}

export interface WebhookResult {
  invoiceId: string
  status: 'paid' | 'failed' | 'refunded'
  providerReference: string
}

export interface PaymentProvider {
  /** Create a hosted checkout URL for an invoice. */
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>

  /** Verify webhook signature and extract event data. Throws on invalid sig. */
  handleWebhook(payload: Buffer, headers: Record<string, string>): Promise<WebhookResult>
}
