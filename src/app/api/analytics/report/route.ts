import { NextResponse } from 'next/server'

/**
 * STUB API - Returns mock system state for dashboard
 * TODO: Wire to actual metrics from Supabase
 */
export async function GET() {
  return NextResponse.json({
    status: '🟢',
    state: 'VALIDATION MODE',
    bankroll: 1000,
    roi: 0.0,
    roi7d: 0.0,
    avgEdge: 0.0,
    drawdown: 0.0,
    recentWinRate: 0.5,
    calibrationError: 0.0,
    totalBetsPlaced: 0,
    timestamp: Date.now(),
  })
}
