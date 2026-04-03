import { NextResponse } from 'next/server'

/**
 * STUB API - Control mode endpoint
 * TODO: Wire to actual system control
 */
export async function GET() {
  return NextResponse.json({
    mode: 'VALIDATION',
    running: true,
  })
}

export async function POST(request: Request) {
  const { mode } = await request.json()
  return NextResponse.json({
    mode,
    updated: true,
  })
}
