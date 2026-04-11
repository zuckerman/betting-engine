import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFootballMarkets } from '@/lib/betfair-odds-service'
import { pollMarketForSharpMoney, SharpSignal } from '@/lib/sharp-money-detector'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sharp-signals
 *
 * Scans live Betfair football markets for sharp money activity.
 * Detects volume spikes, odds steam, and combined signals.
 *
 * Returns array of SharpSignal sorted by confidence + recency.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // If Betfair not connected, return stored signals from DB
  if (!process.env.BETFAIR_APP_KEY || !process.env.BETFAIR_SESSION_TOKEN) {
    const { data } = await supabase
      .from('sharp_signals')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(20)

    return NextResponse.json(data || [])
  }

  try {
    // 1. Get live football markets from Betfair
    const markets = await getFootballMarkets()

    const allSignals: SharpSignal[] = []

    // 2. Poll each market for sharp money (cap at 10 to avoid rate limits)
    const toCheck = markets.slice(0, 10)

    await Promise.all(
      toCheck.map(async (market: any) => {
        const eventName: string = market.event?.name || ''
        const [home, away] = eventName.includes(' v ')
          ? eventName.split(' v ')
          : eventName.includes(' vs ')
          ? eventName.split(' vs ')
          : [eventName, '']

        // Build runner name map
        const runnerNames: Record<number, string> = {}
        for (const runner of market.runners || []) {
          runnerNames[runner.selectionId] = runner.runnerName
        }

        const signals = await pollMarketForSharpMoney(
          market.marketId,
          home.trim(),
          away.trim(),
          runnerNames
        )

        allSignals.push(...signals)
      })
    )

    // 3. Sort: COMBINED first, then HIGH confidence, then by odds move
    allSignals.sort((a, b) => {
      const typeOrder = { COMBINED: 0, VOLUME_SPIKE: 1, ODDS_STEAM: 2, REVERSE_LINE: 3 }
      const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      if (typeOrder[a.signalType] !== typeOrder[b.signalType])
        return typeOrder[a.signalType] - typeOrder[b.signalType]
      if (confOrder[a.confidence] !== confOrder[b.confidence])
        return confOrder[a.confidence] - confOrder[b.confidence]
      return b.oddsMovePct - a.oddsMovePct
    })

    // 4. Persist to DB for history
    if (allSignals.length > 0) {
      await supabase.from('sharp_signals').insert(
        allSignals.map(s => ({
          market_id: s.marketId,
          selection_id: s.selectionId,
          selection_name: s.selectionName,
          home: s.home,
          away: s.away,
          signal_type: s.signalType,
          current_odds: s.currentOdds,
          previous_odds: s.previousOdds,
          odds_move_pct: s.oddsMovePct,
          matched_volume: s.matchedVolume,
          volume_baseline_ratio: s.volumeBaselineRatio,
          confidence: s.confidence,
          recommendation: s.recommendation,
          detected_at: s.detectedAt,
        }))
      )
    }

    return NextResponse.json(allSignals)
  } catch (err) {
    console.error('[SharpSignals] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
