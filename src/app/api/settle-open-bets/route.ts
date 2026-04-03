import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ODDS_API_KEY = process.env.ODDS_API_KEY || ''
const SHARP_BOOKS = ['pinnacle', 'matchbook', 'betfair_ex']

/**
 * Fetch real closing odds from Odds API
 */
async function fetchClosingOdds(home: string, away: string) {
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h`,
      { headers: { 'User-Agent': 'Rivva/1.0' } }
    )

    if (!res.ok) {
      console.error(`Odds API error: ${res.status}`)
      return null
    }

    const data = await res.json()

    // Find matching fixture
    const match = data.find(
      (m: any) =>
        m.home_team?.toLowerCase() === home.toLowerCase() &&
        m.away_team?.toLowerCase() === away.toLowerCase()
    )

    return match?.bookmakers || null
  } catch (err) {
    console.error('Fetch closing odds error:', err)
    return null
  }
}

/**
 * Extract sharp closing price (average of Pinnacle, Matchbook, Betfair)
 */
function extractSharpClosing(bookmakers: any[] | null) {
  if (!bookmakers || bookmakers.length === 0) return null

  const prices: number[] = []

  for (const book of bookmakers) {
    if (!SHARP_BOOKS.includes(book.key)) continue

    const market = book.markets?.[0]
    if (!market?.outcomes) continue

    // Get home team odds (first outcome)
    const homeOdds = market.outcomes[0]?.price
    if (homeOdds && homeOdds > 1.01 && homeOdds < 100) {
      prices.push(homeOdds)
    }
  }

  if (!prices.length) return null

  // Return average of available sharp prices
  return parseFloat(
    (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(3)
  )
}

/**
 * /api/settle-open-bets
 *
 * Settlement process:
 * 1. Find UNSETTLED predictions (settled = false)
 * 2. For each prediction:
 *    - Check if kickoff time has passed
 *    - Fetch real closing odds from Odds API
 *    - Calculate CLV = (entry_odds / closing_odds) - 1
 *    - Mark as SETTLED
 * 3. Return settlement summary
 */
export async function POST() {
  try {
    // Get all unsettled predictions
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
    const settled = []
    const skipped = []

    // Settle each prediction
    for (const pred of predictions) {
      const entryOdds = pred.odds_taken

      // Check if kickoff has passed
      const kickoffTime = new Date(pred.kickoff_at)
      if (now < kickoffTime) {
        skipped.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          reason: 'Not kickoff yet',
        })
        continue
      }

      // Fetch real closing odds from Odds API
      const bookmakers = await fetchClosingOdds(
        pred.home_team,
        pred.away_team
      )

      // Extract sharp closing price
      const closingOdds = extractSharpClosing(bookmakers)

      // Skip if no valid closing odds
      if (!closingOdds) {
        skipped.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          reason: 'No closing odds available',
        })
        continue
      }

      // Calculate REAL CLV using sharp closing price
      // CLV = (entry_odds / closing_odds) - 1
      const clv = (entryOdds / closingOdds) - 1

      // Update prediction record
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
          closingOdds: closingOdds,
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
