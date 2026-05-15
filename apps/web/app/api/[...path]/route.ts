import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const requestPath = `/${path.join('/')}`
  const BLOCKED_PREFIXES = ['/health']
  if (BLOCKED_PREFIXES.some(p => requestPath === p || requestPath.startsWith(`${p}/`))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const upstream = `${API_URL}/${path.join('/')}${req.nextUrl.search}`

  const cookieStore = await cookies()
  const token = cookieStore.get('bms-session')?.value

  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const ct = req.headers.get('content-type')
  if (ct) headers.set('Content-Type', ct)

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body = hasBody ? await req.arrayBuffer() : undefined

  let res: Response
  try {
    res = await fetch(upstream, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    })
  } catch {
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 502 })
  }

  const responseBody = await res.arrayBuffer()
  const responseHeaders = new Headers()
  const responseContentType = res.headers.get('content-type')
  if (responseContentType) responseHeaders.set('content-type', responseContentType)

  return new NextResponse(responseBody, {
    status: res.status,
    headers: responseHeaders,
  })
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
}
