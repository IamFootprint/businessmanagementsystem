import { resetProviderCache } from '../factory'

afterEach(() => {
  resetProviderCache()
  delete process.env.PAYMENT_PROVIDER
})

describe('getPaymentProvider', () => {
  it('defaults to paystack when PAYMENT_PROVIDER is unset', async () => {
    const { getPaymentProvider } = await import('../factory')
    const provider = getPaymentProvider()
    expect(provider.constructor.name).toBe('PaystackAdapter')
  })

  it('returns PayFastAdapter when PAYMENT_PROVIDER=payfast', async () => {
    process.env.PAYMENT_PROVIDER = 'payfast'
    const { getPaymentProvider } = await import('../factory')
    const provider = getPaymentProvider()
    expect(provider.constructor.name).toBe('PayFastAdapter')
  })

  it('returns FastSpringAdapter when PAYMENT_PROVIDER=fastspring', async () => {
    process.env.PAYMENT_PROVIDER = 'fastspring'
    const { getPaymentProvider } = await import('../factory')
    const provider = getPaymentProvider()
    expect(provider.constructor.name).toBe('FastSpringAdapter')
  })

  it('throws for unknown provider name', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe'
    const { getPaymentProvider } = await import('../factory')
    expect(() => getPaymentProvider()).toThrow('Unknown payment provider')
  })

  it('caches the provider instance across calls', async () => {
    const { getPaymentProvider } = await import('../factory')
    const a = getPaymentProvider()
    const b = getPaymentProvider()
    expect(a).toBe(b)
  })
})
