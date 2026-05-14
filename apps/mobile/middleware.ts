import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']
const STATIC_PREFIXES = ['/brand', '/sw.js', '/manifest.webmanifest', '/offline']
const DESKTOP_APP_URL = process.env.DESKTOP_APP_URL

function isMobile(ua: string): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Redirect desktop browsers to the desktop app
  if (DESKTOP_APP_URL) {
    const ua = request.headers.get('user-agent') ?? ''
    if (!isMobile(ua)) {
      return NextResponse.redirect(
        new URL(pathname + request.nextUrl.search, DESKTOP_APP_URL)
      )
    }
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|ico|svg|jpg|jpeg|webp)).*)'],
}
