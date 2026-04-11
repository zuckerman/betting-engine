import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/performance/tracker
 *
 * Hedge fund style P&L analytics:
 * - Total P&L, ROI, Sharpe ratio, max drawdown
 * - Monthly breakdown
 * - Best/worst bets
 * - Win streak tracking
 * - CLV edge capture rate
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: bets, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('settled', true)
    .order('placed_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!bets || bets.length === 0) {
    return NextResponse.json({ empty: true, message: 'No settled bets yet' })
  }

  const STARTING_BANKROLL = 1000

  // ── P&L per bet ──────────────────────────────────────────────────────────
  const betsWithPnl = bets.map((b: any) => {
    // Use stored stake; if missing or suspiciously small (legacy data < £2),
    // fall back to a basic Kelly estimate so the P&L numbers are realistic.
    const rawStake = b.stake ?? 0
    const stake = rawStake >= 2 ? rawStake : (() => {
      const p = b.model_probability || 0.5
      const o = b.odds_taken || 2
      const edge = p * o - 1
      if (edge <= 0) return 5
      const kelly = edge / (o - 1)
      const s = 1000 * kelly * 0.25
      return Math.max(5, Math.min(Math.round(s), 100))
    })()
    const won = b.result === 'win'
    const pnl = won ? stake * (b.odds_taken - 1) : -stake
    return { ...b, stake, pnl }
  })

  const totalStaked   = betsWithPnl.reduce((s: number, b: any) => s + b.stake, 0)
  const totalPnl      = betsWithPnl.reduce((s: number, b: any) => s + b.pnl, 0)
  const wins          = betsWithPnl.filter((b: any) => b.result === 'win').length
  const losses        = betsWithPnl.filter((b: any) => b.result === 'loss').length
  const roi           = totalStaked > 0 ? (totalPnl / totalStaked) * 100 : 0
  const winRate       = bets.length > 0 ? (wins / bets.length) * 100 : 0

  // ── Running bankroll + drawdown ───────────────────────────────────────────
  let bankroll = STARTING_BANKROLL
  let peak = STARTING_BANKROLL
  let maxDrawdown = 0
  let maxDrawdownPct = 0

  const equity: { date: string; bankroll: number; drawdown: number }[] = []

  for (const b of betsWithPnl) {
    bankroll += b.pnl
    if (bankroll > peak) peak = bankroll
    const dd = peak - bankroll
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0
    if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownPct = ddPct }
    equity.push({
      date: b.settled_at || b.placed_at,
      bankroll: parseFloat(bankroll.toFixed(2)),
      drawdown: parseFloat(ddPct.toFixed(2)),
    })
  }

  // ── Sharpe ratio (annualised, risk-free = 0) ──────────────────────────────
  const returns = betsWithPnl.map((b: any) => b.pnl / b.stake)
  const meanReturn = returns.reduce((s: number, r: number) => s + r, 0) / returns.length
  const variance = returns.reduce((s: number, r: number) => s + Math.pow(r - meanReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const betsPerYear = 365  // assume ~1/day for annualisation
  const sharpe = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(betsPerYear) : 0

  // ── CLV edge capture ─────────────────────────────────────────────────────
  const betsWithClv = betsWithPnl.filter((b: any) => b.closing_odds != null)
  const positiveClv = betsWithClv.filter((b: any) => b.odds_taken > b.closing_odds).length
  const clvCaptureRate = betsWithClv.length > 0 ? (positiveClv / betsWithClv.length) * 100 : 0
  const avgClv = betsWithClv.length > 0
    ? betsWithClv.reduce((s: number, b: any) => s + ((b.odds_taken - b.closing_odds) / b.closing_odds * 100), 0) / betsWithClv.length
    : 0

  // ── Monthly breakdown ─────────────────────────────────────────────────────
  const monthlyMap = new Map<string, { pnl: number; bets: number; wins: number; staked: number }>()
  for (const b of betsWithPnl) {
    const month = (b.settled_at || b.placed_at || '').slice(0, 7) // "YYYY-MM"
    if (!month) continue
    const entry = monthlyMap.get(month) || { pnl: 0, bets: 0, wins: 0, staked: 0 }
    entry.pnl    += b.pnl
    entry.bets   += 1
    entry.wins   += b.result === 'win' ? 1 : 0
    entry.staked += b.stake
    monthlyMap.set(month, entry)
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      pnl:     parseFloat(d.pnl.toFixed(2)),
      roi:     parseFloat((d.staked > 0 ? (d.pnl / d.staked) * 100 : 0).toFixed(1)),
      bets:    d.bets,
      winRate: parseFloat((d.bets > 0 ? (d.wins / d.bets) * 100 : 0).toFixed(1)),
    }))

  // ── Best / worst bets (deduplicated by fixture) ───────────────────────────
  // Pick the single best and worst market per fixture to avoid the same game
  // appearing in both lists when multiple markets are tracked per match.
  const fixtureMap = new Map<string, any>()
  for (const b of betsWithPnl) {
    const key = `${b.home_team}|${b.away_team}`
    const existing = fixtureMap.get(key)
    // Keep the bet with highest absolute P&L per fixture (most impactful)
    if (!existing || Math.abs(b.pnl) > Math.abs(existing.pnl)) {
      fixtureMap.set(key, b)
    }
  }

  const uniqueBets = Array.from(fixtureMap.values())
  const sortedUnique = [...uniqueBets].sort((a: any, b: any) => b.pnl - a.pnl)

  const bestBets = sortedUnique.slice(0, 5).map((b: any) => ({
    fixture: `${b.home_team} vs ${b.away_team}`,
    market: b.market,
    odds: b.odds_taken,
    stake: b.stake,
    pnl: parseFloat(b.pnl.toFixed(2)),
    date: b.placed_at,
  }))
  const worstBets = sortedUnique.slice(-5).reverse().map((b: any) => ({
    fixture: `${b.home_team} vs ${b.away_team}`,
    market: b.market,
    odds: b.odds_taken,
    stake: b.stake,
    pnl: parseFloat(b.pnl.toFixed(2)),
    date: b.placed_at,
  }))

  // ── Current streak ────────────────────────────────────────────────────────
  let streak = 0
  let streakType: 'W' | 'L' | null = null
  for (let i = betsWithPnl.length - 1; i >= 0; i--) {
    const isWin = betsWithPnl[i].result === 'win'
    if (streakType === null) { streakType = isWin ? 'W' : 'L'; streak = 1 }
    else if ((streakType === 'W') === isWin) streak++
    else break
  }

  return NextResponse.json({
    summary: {
      totalBets:        bets.length,
      wins,
      losses,
      winRate:          parseFloat(winRate.toFixed(1)),
      totalStaked:      parseFloat(totalStaked.toFixed(2)),
      totalPnl:         parseFloat(totalPnl.toFixed(2)),
      roi:              parseFloat(roi.toFixed(2)),
      currentBankroll:  parseFloat(bankroll.toFixed(2)),
      startingBankroll: STARTING_BANKROLL,
      bankrollGrowth:   parseFloat(((bankroll - STARTING_BANKROLL) / STARTING_BANKROLL * 100).toFixed(1)),
      maxDrawdown:      parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPct:   parseFloat(maxDrawdownPct.toFixed(1)),
      sharpe:           parseFloat(sharpe.toFixed(2)),
      clvCaptureRate:   parseFloat(clvCaptureRate.toFixed(1)),
      avgClv:           parseFloat(avgClv.toFixed(2)),
      streak:           { count: streak, type: streakType },
    },
    equity,
    monthly,
    bestBets,
    worstBets,
  })
}
