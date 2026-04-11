import { NextResponse } from 'next/server'

/**
 * /api/generate-v2
 * 
 * DEPRECATED - Focus on single model instead of parallel systems
 * Use /api/ratings/refresh to load team ratings foundation first
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'V2 system disabled',
      message: 'Focus on single model. Use /api/ratings/refresh to build foundation first.',
    },
    { status: 410 }
  )
}

export const dynamic = 'force-dynamic'
