import { NextRequest, NextResponse } from 'next/server'
import { getPaymentProvider } from '@/src/lib/payments/factory'
import { isKillSwitchActive, KILL_SWITCHES } from '@/src/lib/db/feature-flags'
import { serviceUnavailable } from '@/lib/api/responses'
import { withShopContext } from '@/src/lib/db/shop-context'

export async function POST(req: NextRequest) {
  if (await isKillSwitchActive(KILL_SWITCHES.BILLING)) {
    return serviceUnavailable('Billing is temporarily unavailable')
  }

  const { invoiceId, shopId } = await req.json()
  if (!invoiceId || !shopId) {
    return NextResponse.json({ error: 'invoiceId and shopId required' }, { status: 400 })
  }

  const invoice = await withShopContext(shopId, (tx) =>
    tx.invoice.findUnique({ where: { id: invoiceId, shopId } })
  )
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const provider = getPaymentProvider()
  const result = await provider.createCheckout({
    shopId,
    invoiceId,
    amountCents: invoice.totalCents,
    currency: 'ZAR',
    successUrl: `${baseUrl}/admin/billing?invoiceId=${invoiceId}&status=success`,
    cancelUrl: `${baseUrl}/admin/billing?invoiceId=${invoiceId}&status=cancelled`,
  })

  await withShopContext(shopId, (tx) =>
    tx.invoice.update({
      where: { id: invoiceId },
      data: { providerReference: result.providerReference },
    })
  )

  return NextResponse.json({ checkoutUrl: result.checkoutUrl })
}
