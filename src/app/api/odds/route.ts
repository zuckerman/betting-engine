/**
 * Real Odds Pipeline
 * 
 * Fetches live odds for upcoming fixtures and closing odds at kickoff
 * Stores real market data that can be used for signal generation and CLV calculation
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ODDS_API_KEY = process.env.ODDS_API_KEY
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

interface UpcomingFixture {
  fixtureId: string
  homeTeam: string
  awayTeam: string
  kickoff: string
  marketOdds: {
    home: number
    draw: number
    away: number
  }
}

/**
 * GET /api/odds/upcoming
 * 
 * Fetch live odds for upcoming EPL matches
 * Returns fixtures with real bookmaker odds (next 7 days)
 */
export async function GET(req: Request) {
  if (!ODDS_API_KEY) {
    return NextResponse.json(
      { error: 'ODDS_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    // Fetch upcoming EPL matches from The Odds API
    const response = await fetch(
      `${ODDS_API_BASE}/sports/soccer_epl/odds?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h&dateFormat=iso&oddsFormat=decimal`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`Odds API returned ${response.status}`)
    }

    const events = await response.json()

    if (!Array.isArray(events)) {
      throw new Error('Invalid response format from Odds API')
    }

    // Parse into our format
    const fixtures: UpcomingFixture[] = []

    for (const event of events) {
      if (!event.bookmakers || event.bookmakers.length === 0) continue

      // Get odds from first available bookmaker (usually sharpest)
      const bm = event.bookmakers[0]
      const market = bm.markets?.find((m: any) => m.key === 'h2h')
      
      if (!market || !market.outcomes) continue

      const outcomes = market.outcomes
      const home = outcomes.find((o: any) => o.name === event.home_team)
      const away = outcomes.find((o: any) => o.name === event.away_team)
      const draw = outcomes.find((o: any) => o.name === 'Draw')

      if (!home || !away || !draw) continue

      fixtures.push({
        fixtureId: event.id,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        kickoff: event.commence_time,
        marketOdds: {
          home: home.price,
          draw: draw.price,
          away: away.price
        }
      })
    }

    return NextResponse.json({
      success: true,
      fixtures,
      count: fixtures.length,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[ODDS_PIPELINE] Error fetching odds:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/odds/capture-closing
 * 
 * Fetch closing odds for fixtures where kickoff has passed
 * Call this as a cron job (every hour) to populate closing_odds
 */
export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  if (!ODDS_API_KEY) {
    return NextResponse.json(
      { error: 'ODDS_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    // Find all predictions where:
    // - kickoff_at < now (match has started/ended)
    // - closing_odds IS NULL (not yet populated)
    // - settled = false (not yet settled)
    const { data: unsettledPredictions, error: queryError } = await supabase
      .from('predictions')
      .select('id, match_id, home_team, away_team, kickoff_at')
      .lt('kickoff_at', new Date().toISOString())
      .is('closing_odds', null)
      .eq('settled', false)
      .limit(50) // Process in batches

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`)
    }

    if (!unsettledPredictions || unsettledPredictions.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        updated: 0,
        message: 'No predictions needing closing odds'
      })
    }

    // Fetch fresh odds from API
    const response = await fetch(
      `${ODDS_API_BASE}/sports/soccer_epl/odds?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h&dateFormat=iso&oddsFormat=decimal`
    )

    if (!response.ok) {
      throw new Error(`Odds API returned ${response.status}`)
    }

    const events = await response.json()

    // Build lookup map: "Home vs Away" -> odds
    const oddsMap = new Map<string, { home: number; draw: number; away: number }>()

    for (const event of events) {
      if (!event.bookmakers || event.bookmakers.length === 0) continue

      const bm = event.bookmakers[0]
      const market = bm.markets?.find((m: any) => m.key === 'h2h')

      if (!market || !market.outcomes) continue

      const outcomes = market.outcomes
      const home = outcomes.find((o: any) => o.name === event.home_team)
      const away = outcomes.find((o: any) => o.name === event.away_team)
      const draw = outcomes.find((o: any) => o.name === 'Draw')

      if (!home || !away || !draw) continue

      const key = `${event.home_team}|${event.away_team}`
      oddsMap.set(key, {
        home: home.price,
        draw: draw.price,
        away: away.price
      })
    }

    // Update predictions with closing odds
    let updated = 0
    const updates = []

    for (const pred of unsettledPredictions) {
      const key = `${pred.home_team}|${pred.away_team}`
      const odds = oddsMap.get(key)

      if (!odds) {
        console.warn(`[ODDS_PIPELINE] No odds found for ${key}`)
        continue
      }

      // Determine which odds to use based on the bet market
      let closingOdds: number
      if (pred.market === 'HOME' || pred.market === 'home') {
        closingOdds = odds.home
      } else if (pred.market === 'DRAW' || pred.market === 'draw') {
        closingOdds = odds.draw
      } else if (pred.market === 'AWAY' || pred.market === 'away') {
        closingOdds = odds.away
      } else {
        // Default to home
        closingOdds = odds.home
      }

      updates.push({
        id: pred.id,
        closing_odds: closingOdds,
        updated_at: new Date().toISOString()
      })
    }

    // Batch update
    if (updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('predictions')
          .update({ closing_odds: update.closing_odds, updated_at: update.updated_at })
          .eq('id', update.id)

        if (!error) {
          updated += 1
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: unsettledPredictions.length,
      updated,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[ODDS_PIPELINE] Error capturing closing odds:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
