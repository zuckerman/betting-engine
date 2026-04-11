import { NextResponse } from 'next/server'

/**
 * /api/seed-signals-v2
 * 
 * DEPRECATED - Synthetic data disabled
 * Use /api/ratings/refresh to build real foundation first
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Synthetic seed signals DISABLED',
      message: 'Use /api/ratings/refresh to build team ratings foundation',
      reason: 'Focus on real data pipeline first. Synthetic data invalidates calibration.',
    },
    { status: 410 }
  )
}

export const dynamic = 'force-dynamic'
