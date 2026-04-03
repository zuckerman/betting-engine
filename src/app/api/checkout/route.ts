import { NextRequest, NextResponse } from 'next/server'

/**
 * /api/checkout
 * 
 * Temporarily disabled during core validation phase
 * Will be re-enabled after CLV validation (Day 14+)
 * 
 * TODO: Stripe integration when system proves edge
 */

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Checkout disabled during validation phase',
      reason: 'Core system must prove edge exists before accepting payments',
      status: 'coming after Day 14',
    },
    { status: 503 }
  )
}

