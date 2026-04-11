/**
 * GET /api/line-shop
 *
 * Returns best available odds across all bookmakers for all active fixtures.
 * Highlights:
 * - Which book has the best price per outcome
 * - How much better the best price is vs. Pinnacle (sharp reference)
 * - Any genuine arbitrage opportunities (guaranteed profit)
 *
 * Query params:
 *   ?arb=true   — only return fixtures with arb opportunities
 *   ?league=EPL — filter by league name
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLineShopping, calcArbStakes } from '@/lib/line-shopper'
import { getActiveLeagues } from '@/lib/season-manager'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const arbOnly   = searchParams.get('arb') === 'true'
  const leagueFilter = searchParams.get('league')?.toLowerCase()

  const activeLeagues = getActiveLeagues()
  const targetLeagues = leagueFilter
    ? activeLeagues.filter(l => l.name.toLowerCase().includes(leagueFilter))
    : activeLeagues.slice(0, 6) // cap at 6 leagues to manage API quota

  const allFixtures = []
  const errors: string[] = []

  for (const league of targetLeagues) {
    try {
      const fixtures = await getLineShopping(league.key, league.name)
      allFixtures.push(...fixtures)
    } catch (e) {
      errors.push(`${league.name}: ${e}`)
    }
  }

  // Sort: arbs first, then by best line shopping edge available
  allFixtures.sort((a, b) => {
    if (a.isArb !== b.isArb) return a.isArb ? -1 : 1
    const aMaxEdge = Math.max(a.lineDiffHome ?? 0, a.lineDiffDraw ?? 0, a.lineDiffAway ?? 0)
    const bMaxEdge = Math.max(b.lineDiffHome ?? 0, b.lineDiffDraw ?? 0, b.lineDiffAway ?? 0)
    return bMaxEdge - aMaxEdge
  })

  const filtered = arbOnly ? allFixtures.filter(f => f.isArb) : allFixtures

  // Enrich arbs with stake calculator
  const enriched = filtered.map(f => {
    if (!f.isArb || !f.bestHome.odds || !f.bestDraw.odds || !f.bestAway.odds) return f
    const arb = calcArbStakes(f.bestHome.odds, f.bestDraw.odds, f.bestAway.odds, 100)
    return { ...f, arbStakes: arb }
  })

  const arbCount = enriched.filter(f => f.isArb).length

  return NextResponse.json({
    fixtures: enriched,
    count: enriched.length,
    arbOpportunities: arbCount,
    leaguesCovered: targetLeagues.map(l => l.name),
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
    tip: arbCount > 0
      ? `${arbCount} guaranteed-profit arb found. Act fast — these close within minutes.`
      : 'No arbs right now. Check the line shopping edge column for +EV prices.',
  })
}
