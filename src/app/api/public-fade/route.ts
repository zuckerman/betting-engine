/**
 * GET /api/public-fade
 *
 * Detects reverse line movement (RLM) — situations where the public is
 * betting heavily on one side but the line moves against them, indicating
 * sharp/professional money is on the other side.
 *
 * Returns fixtures with RLM signals sorted by confidence.
 */

import { NextResponse } from 'next/server'
import { getLineShopping } from '@/lib/line-shopper'
import { detectPublicFade, recordOddsSnapshot } from '@/lib/public-fade'
import { getActiveLeagues } from '@/lib/season-manager'

export const dynamic = 'force-dynamic'

export async function GET() {
  const activeLeagues = getActiveLeagues()
  const signals = []
  const errors: string[] = []

  for (const league of activeLeagues.slice(0, 5)) {
    try {
      const fixtures = await getLineShopping(league.key, league.name)

      for (const fixture of fixtures) {
        // Record current odds snapshot (builds history for RLM detection)
        recordOddsSnapshot(fixture.fixtureId, {
          home: fixture.bestHome.odds,
          draw: fixture.bestDraw.odds,
          away: fixture.bestAway.odds,
        })

        // Detect reverse line movement
        const signal = detectPublicFade(
          fixture.fixtureId,
          fixture.homeTeam,
          fixture.awayTeam,
          fixture.kickoff,
          fixture.league,
          {
            home: fixture.bestHome.odds,
            draw: fixture.bestDraw.odds,
            away: fixture.bestAway.odds,
          },
          // Pass sharp book odds as reference if available
          fixture.sharpHome && fixture.sharpDraw && fixture.sharpAway
            ? { home: fixture.sharpHome, draw: fixture.sharpDraw, away: fixture.sharpAway }
            : undefined,
        )

        if (signal) signals.push(signal)
      }
    } catch (e) {
      errors.push(`${league.name}: ${e}`)
    }
  }

  // Sort: HIGH confidence first
  signals.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return order[a.confidence] - order[b.confidence]
  })

  return NextResponse.json({
    signals,
    count: signals.length,
    note: signals.length === 0
      ? 'No RLM signals detected. This endpoint needs multiple polls (every 5-10 min) to build line movement history.'
      : undefined,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  })
}
