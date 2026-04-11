import { NextResponse } from 'next/server'

/**
 * /api/seed-signals-past
 * 
 * DEPRECATED - Synthetic data disabled
 * Use /api/generate-real-signals instead for real data
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Synthetic seed signals DISABLED',
      message: 'Use POST /api/generate-real-signals instead',
      reason: 'Synthetic data invalidates calibration tests. Real fixtures + real odds required.',
      docs: 'http://localhost:3000/api/generate-real-signals'
    },
    { status: 410 } // Gone
  )
}

export const dynamic = 'force-dynamic'
