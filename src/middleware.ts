import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pin = request.cookies.get('rivva_pin')?.value
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isLogin = request.nextUrl.pathname === '/auth/login'

  if (!pin && isDashboard) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  if (pin && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login'],
}
