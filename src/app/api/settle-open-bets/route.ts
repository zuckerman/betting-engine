import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ODDS_API_KEY = process.env.ODDS_API_KEY || ''
const SHARP_BOOKS = ['pinnacle', 'matchbook', 'betfair_ex']

// Global cache for odds (in-memory, per-minute)
const oddsCache = new Map<string, { data: any; timestamp: number }>()

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSameMatch(
  apiMatch: any,
  home: string,
  away: string,
  kickoff: string
): boolean {
  const apiKickoff = new Date(apiMatch.commence_time).getTime()
  const predictedKickoff = new Date(kickoff).getTime()
  const timeDiff = Math.abs(apiKickoff - predictedKickoff)

  if (timeDiff > 60 * 60 * 1000) return false

  const homeMatch =
    normalizeName(apiMatch.home_team).includes(normalizeName(home)) ||
    normalizeName(home).includes(normalizeName(apiMatch.home_team))

  const awayMatch =
    normalizeName(apiMatch.away_team).includes(normalizeName(away)) ||
    normalizeName(away).includes(normalizeName(apiMatch.away_team))

  return homeMatch && awayMatch
}

async function fetchClosingOdds(
  home: string,
  away: string,
  kickoff: string
): Promise<any[] | null> {
  try {
    const cacheKey = 'epl_odds'
    const now = Date.now()

    if (oddsCache.has(cacheKey)) {
      const cached = oddsCache.get(cacheKey)!
      if (now - cached.timestamp < 60 * 1000) {
        console.log('[Settlement] Using cached odds')
        const match = cached.data.find((m: any) => isSameMatch(m, home, away, kickoff))
        return match?.bookmakers || null
      }
    }

    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h`,
      { headers: { 'User-Agent': 'Rivva/1.0' } }
    )

    if (!res.ok) {
      console.error(`Odds API error: ${res.status}`)
      return null
    }

    const data = await res.json()
    oddsCache.set(cacheKey, { data, timestamp: now })

    const match = data.find((m: any) => isSameMatch(m, home, away, kickoff))
    return match?.bookmakers || null
  } catch (err) {
    console.error('Fetch closing odds error:', err)
    return null
  }
}

function extractClosing(bookmakers: any[] | null): number | null {
  if (!bookmakers || bookmakers.length === 0) return null

  let prices: number[] = []

  // Tier 1: Sharp books only
  for (const book of bookmakers) {
    if (!SHARP_BOOKS.includes(book.key)) continue

    const market = book.markets?.[0]
    if (!market?.outcomes) continue

    const homeOdds = market.outcomes[0]?.price
    if (homeOdds && homeOdds > 1.01 && homeOdds < 100) {
      prices.push(homeOdds)
    }
  }

  // Tier 2: Fallback to any book if no sharp prices
  if (!prices.length) {
    for (const book of bookmakers) {
      const market = book.markets?.[0]
      if (!market?.outcomes) continue

      const homeOdds = market.outcomes[0]?.price
      if (homeOdds && homeOdds > 1.01 && homeOdds < 100) {
        prices.push(homeOdds)
      }
    }
  }

  if (!prices.length) return null

  return parseFloat(
    (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(3)
  )
}

export async function POST() {
  try {
    const { data: predictions, error: fetchErr } = await supabase
      .from('predictions')
      .select('*')
      .eq('settled', false)
      .limit(50)

    if (fetchErr) {
      console.error('Fetch error:', fetchErr)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      )
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        settled: 0,
        message: 'No unsettled predictions',
      })
    }

    const now = new Date()
    const settled: any[] = []
    const skipped: any[] = []

    for (const pred of predictions) {
      const entryOdds = pred.odds_taken

      // Wait for kickoff + 15 mins (markets frozen)
      const kickoffTime = new Date(pred.kickoff_at)
      const settleAfterTime = new Date(kickoffTime.getTime() + 15 * 60 * 1000)

      if (now < settleAfterTime) {
        skipped.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          reason: 'Market stabilization (15 mins after kickoff)',
        })
        continue
      }

      // Fetch real closing odds with fuzzy matching
      const bookmakers = await fetchClosingOdds(
        pred.home_team,
        pred.away_team,
        pred.kickoff_at
      )

      const closingOdds = extractClosing(bookmakers)

      if (!closingOdds) {
        skipped.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          reason: 'No closing odds available',
        })
        continue
      }

      const clv = (entryOdds / closingOdds) - 1

      const { error: updateErr } = await supabase
        .from('predictions')
        .update({
          closing_odds: closingOdds,
          clv: parseFloat((clv * 100).toFixed(2)),
          settled: true,
          settled_at: new Date().toISOString(),
        })
        .eq('id', pred.id)

      if (!updateErr) {
        settled.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          entryOdds: parseFloat(entryOdds.toFixed(3)),
          closingOdds,
          clv: parseFloat((clv * 100).toFixed(2)),
          edge: parseFloat((pred.edge * 100).toFixed(2)),
        })
      }
    }

    return NextResponse.json({
      success: true,
      settled: settled.length,
      skipped: skipped.length,
      bets: settled,
      skippedReasons: skipped,
    })
  } catch (err) {
    console.error('Settlement error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
