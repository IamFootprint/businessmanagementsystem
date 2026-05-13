import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { periodId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('bms-session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/periods/${periodId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    return new NextResponse(body, { status: res.status })
  }

  const csv = await res.text()
  const disposition = res.headers.get('content-disposition') ?? `attachment; filename="report.csv"`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': disposition,
    },
  })
}
