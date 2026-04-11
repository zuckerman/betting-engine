/**
 * GET /api/value-bets
 *
 * Real-time value bet scanner — RebelBetting style.
 *
 * Scans active leagues, compares soft book prices against Pinnacle's
 * no-vig true probability, and returns all bets where the soft book
 * is overpriced (soft_odds > fair_odds = positive EV).
 *
 * Query params:
 *   ?minEdge=0.03    — minimum edge % to return (default 2%)
 *   ?league=EPL      — filter by league
 *   ?book=bet365     — filter by bookmaker
 */

import { NextRequest, NextResponse } from 'next/server'
import { scanLeagueForValue } from '@/lib/value-bet-scanner'
import { getActiveLeagues } from '@/lib/season-manager'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const minEdge     = parseFloat(searchParams.get('minEdge') || '0.02')
  const leagueFilter = searchParams.get('league')?.toLowerCase()
  const bookFilter   = searchParams.get('book')?.toLowerCase()

  const activeLeagues = getActiveLeagues()
  const targetLeagues = leagueFilter
    ? activeLeagues.filter(l => l.name.toLowerCase().includes(leagueFilter))
    : activeLeagues.slice(0, 6)  // cap to manage API quota

  const allBets: any[] = []
  const errors: string[] = []
  let totalFixtures = 0
  let totalOutcomes = 0

  for (const league of targetLeagues) {
    try {
      const result = await scanLeagueForValue(league.key, league.name, minEdge)
      allBets.push(...result.bets)
      totalFixtures += result.fixtures
      totalOutcomes += result.outcomes
    } catch (e) {
      errors.push(`${league.name}: ${e}`)
    }
  }

  // Apply book filter
  const filtered = bookFilter
    ? allBets.filter(b => b.softBook.includes(bookFilter))
    : allBets

  // Sort: HIGH confidence + highest EV first
  filtered.sort((a, b) => {
    const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    if (confOrder[a.confidence as keyof typeof confOrder] !== confOrder[b.confidence as keyof typeof confOrder]) {
      return confOrder[a.confidence as keyof typeof confOrder] - confOrder[b.confidence as keyof typeof confOrder]
    }
    return b.ev - a.ev
  })

  // Summary stats
  const highCount   = filtered.filter(b => b.confidence === 'HIGH').length
  const avgYield    = filtered.length > 0
    ? filtered.reduce((s, b) => s + b.yield, 0) / filtered.length
    : 0

  return NextResponse.json({
    valueBets: filtered,
    count: filtered.length,
    highConfidence: highCount,
    avgYield: parseFloat(avgYield.toFixed(2)),
    scannedFixtures: totalFixtures,
    scannedOutcomes: totalOutcomes,
    leaguesCovered: targetLeagues.map(l => l.name),
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
    tip: filtered.length > 0
      ? `${filtered.length} value bets found. Avg yield: +${avgYield.toFixed(1)}% per £100 staked. Target 3-5% yield for long-term profit.`
      : 'No value bets above the edge threshold right now. Try lowering minEdge or check back in 5 minutes.',
  })
}
