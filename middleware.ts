import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// DISABLED: Auth middleware stripped for validation phase
// Re-enable after edge validation complete

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
