import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/receipts/upload']
const MOBILE_APP_URL = process.env.MOBILE_APP_URL

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect mobile browsers to the PWA
  if (MOBILE_APP_URL && !pathname.startsWith('/api')) {
    const ua = request.headers.get('user-agent') ?? ''
    if (/iPhone|iPad|iPod|Android/i.test(ua)) {
      return NextResponse.redirect(
        new URL(pathname + request.nextUrl.search, MOBILE_APP_URL)
      )
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const token = request.cookies.get('bms-session')?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
