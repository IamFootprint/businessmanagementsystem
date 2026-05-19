import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/admin-sign-in', '/receipts/upload']
const MOBILE_APP_URL = process.env.MOBILE_APP_URL

function isMobile(ua: string): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect mobile browsers to the PWA (skip API routes and static assets)
  if (MOBILE_APP_URL && !pathname.startsWith('/api')) {
    const ua = request.headers.get('user-agent') ?? ''
    if (isMobile(ua)) {
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
