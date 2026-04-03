import { NextResponse } from 'next/server'

/**
 * STUB API - Kill switch
 * TODO: Wire to actual system shutdown
 */
export async function POST() {
  return NextResponse.json({
    status: 'System stub - no actual kill switch',
  })
}
