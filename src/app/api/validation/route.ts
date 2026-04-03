import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your@email.com'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Restrict to admin only
  if (authError || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Demo data - replace with real predictions query
  const demoData = [
    { league: 'EPL', market: 'Over/Under', odds: 1.95, closing_odds: 1.92, result: 'win', edge: 0.06 },
    { league: 'EPL', market: 'Over/Under', odds: 2.10, closing_odds: 2.15, result: 'win', edge: 0.08 },
    { league: 'EPL', market: 'Over/Under', odds: 1.88, closing_odds: 1.85, result: 'loss', edge: 0.05 },
    { league: 'LaLiga', market: 'BTTS', odds: 2.05, closing_odds: 2.08, result: 'win', edge: 0.04 },
    { league: 'LaLiga', market: 'BTTS', odds: 1.92, closing_odds: 1.89, result: 'loss', edge: 0.03 },
    { league: 'LaLiga', market: 'BTTS', odds: 2.20, closing_odds: 2.12, result: 'loss', edge: 0.02 },
    { league: 'EPL', market: 'Moneyline', odds: 1.80, closing_odds: 1.85, result: 'win', edge: 0.07 },
    { league: 'EPL', market: 'Moneyline', odds: 2.30, closing_odds: 2.25, result: 'win', edge: 0.09 },
  ]

  // Calculate overall stats
  // CLV = (1/closing_odds) - (1/opening_odds) - did you beat the market closing line?
  let totalCLV = 0
  let positiveCLV = 0
  let totalProfit = 0
  let totalStake = demoData.length

  const byLeague: Record<string, any[]> = {}
  const byMarket: Record<string, any[]> = {}

  demoData.forEach((bet) => {
    const closingImplied = 1 / bet.closing_odds
    const openingImplied = 1 / bet.odds
    const clv = closingImplied - openingImplied
    totalCLV += clv
    if (clv > 0) positiveCLV++

    if (bet.result === 'win') {
      totalProfit += bet.odds - 1
    } else {
      totalProfit -= 1
    }

    if (!byLeague[bet.league]) byLeague[bet.league] = []
    byLeague[bet.league].push(bet)

    if (!byMarket[bet.market]) byMarket[bet.market] = []
    byMarket[bet.market].push(bet)
  })

  const calcSegmentStats = (bets: typeof demoData) => {
    let clv = 0
    let positive = 0
    let profit = 0

    bets.forEach((b) => {
      const closingImplied = 1 / b.closing_odds
      const openingImplied = 1 / b.odds
      const c = closingImplied - openingImplied
      clv += c
      if (c > 0) positive++
      profit += b.result === 'win' ? b.odds - 1 : -1
    })

    return {
      count: bets.length,
      avgCLV: clv / bets.length,
      hitRate: (positive / bets.length) * 100,
      roi: (profit / bets.length) * 100,
    }
  }

  const leagueStats = Object.entries(byLeague).map(([league, bets]) => ({
    league,
    ...calcSegmentStats(bets),
  }))

  const marketStats = Object.entries(byMarket).map(([market, bets]) => ({
    market,
    ...calcSegmentStats(bets),
  }))

  const avgCLV = totalCLV / demoData.length
  const roi = (totalProfit / totalStake) * 100
  const positiveCLVPercent = (positiveCLV / demoData.length) * 100

  return NextResponse.json({
    total: demoData.length,
    avgCLV,
    positiveCLVPercent,
    roi,
    leagueStats,
    marketStats,
    redFlags: {
      negativeCLV: avgCLV < 0,
      lowHitRate: positiveCLVPercent < 50,
      smallSample: demoData.length < 100,
      negativeROI: roi < 0,
    },
  })
}
