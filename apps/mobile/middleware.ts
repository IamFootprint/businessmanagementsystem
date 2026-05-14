import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']
const STATIC_PREFIXES = ['/brand', '/sw.js', '/manifest.webmanifest', '/offline']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

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
