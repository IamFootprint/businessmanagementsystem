import { NextRequest, NextResponse } from 'next/server'
import { getPaymentProvider } from '@/src/lib/payments/factory'
import { withShopContext } from '@/src/lib/db/shop-context'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const payload = Buffer.from(await req.arrayBuffer())
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  let result
  try {
    const provider = getPaymentProvider()
    result = await provider.handleWebhook(payload, headers)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (result.status === 'paid' && result.invoiceId) {
    // Look up the shop for this invoice so we can apply RLS
    const invoice = await prisma.invoice.findUnique({
      where: { id: result.invoiceId },
      select: { shopId: true },
    })

    if (invoice) {
      await withShopContext(invoice.shopId, (tx) =>
        tx.invoice.update({
          where: { id: result.invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            providerReference: result.providerReference,
          },
        })
      )
    }
  }

  return NextResponse.json({ received: true })
}
