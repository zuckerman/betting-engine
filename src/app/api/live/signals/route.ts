import { NextResponse } from 'next/server'

/**
 * STUB API - Returns empty signals for dashboard
 * TODO: Wire to actual prediction signals from Supabase
 */
export async function GET() {
  return NextResponse.json({
    signals: [],
    total: 0,
  })
}
