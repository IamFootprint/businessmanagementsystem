import type { PaymentProvider } from './provider'
import { PaystackAdapter } from './paystack'
import { PayFastAdapter } from './payfast'
import { FastSpringAdapter } from './fastspring'
import { NoopPaymentAdapter } from './noop'

let _cachedProvider: PaymentProvider | null = null
let _cachedName: string | null = null

/** Return the active PaymentProvider. Cached per process. */
export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? 'paystack'

  if (_cachedProvider && _cachedName === name) {
    return _cachedProvider
  }

  let provider: PaymentProvider
  switch (name) {
    case 'paystack':
      provider = new PaystackAdapter()
      break
    case 'payfast':
      provider = new PayFastAdapter()
      break
    case 'fastspring':
      provider = new FastSpringAdapter()
      break
    case 'none':
      provider = new NoopPaymentAdapter()
      break
    default:
      throw new Error(
        `Unknown payment provider: "${name}". ` +
        'Set PAYMENT_PROVIDER to one of: paystack, payfast, fastspring, none'
      )
  }

  _cachedProvider = provider
  _cachedName = name
  return provider
}

/** Clear the cached provider (for tests or after env change). */
export function resetProviderCache(): void {
  _cachedProvider = null
  _cachedName = null
}
