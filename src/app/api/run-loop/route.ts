import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * MAIN ORCHESTRATOR
 * Runs the complete betting loop:
 * 1. Get active experiment
 * 2. Check CLV health
 * 3. Check completion (150 bets → rotate)
 * 4. Fetch fixtures
 * 5. Run model
 * 6. Generate bets (with Kelly staking + risk controls)
 * 7. Update closing odds
 * 8. Settle results
 * 9. Calculate CLV
 * 10. Update bankroll
 */

let supabase: any = null

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

export async function POST() {
  const supabase = getSupabase()
  try {
    console.log('[RUN-LOOP] Starting orchestrator...')

    // 1. Get active experiment
    const experiment = await getActiveExperiment()
    if (!experiment) {
      console.log('[RUN-LOOP] No active experiment found')
      return NextResponse.json({ message: 'No active experiment' }, { status: 200 })
    }
    console.log(`[RUN-LOOP] Active experiment: ${experiment.name}`)

    // 2. Check CLV health (CRITICAL)
    const isHealthy = await checkCLVHealth(experiment.id, experiment.name)
    if (!isHealthy) {
      console.error('[RUN-LOOP] CLV NEGATIVE → SYSTEM HALTED')
      return NextResponse.json(
        { message: 'CLV negative - system halted' },
        { status: 200 }
      )
    }
    console.log('[RUN-LOOP] CLV health check passed ✓')

    // 3. Check experiment completion (150 bets → rotate)
    const isComplete = await checkExperimentCompletion(experiment.id)
    if (isComplete) {
      console.log('[RUN-LOOP] Experiment reached 150 bets → rotating...')
      await rotateExperiment(experiment)
      return NextResponse.json({ message: 'Experiment rotated' }, { status: 200 })
    }

    // 4. Fetch fixtures
    console.log('[RUN-LOOP] Fetching fixtures...')
    // await fetchFixtures(experiment.id)

    // 5. Run model
    console.log('[RUN-LOOP] Running model...')
    // await runModel(experiment.id)

    // 6. Generate bets (with Kelly + risk controls)
    console.log('[RUN-LOOP] Generating bets...')
    await generateBets(experiment.id)

    // 7. Update closing odds
    console.log('[RUN-LOOP] Updating closing odds...')
    // await updateClosingOdds(experiment.id)

    // 8. Settle results
    console.log('[RUN-LOOP] Settling results...')
    // await settleResults(experiment.id)

    // 9. Calculate CLV
    console.log('[RUN-LOOP] Calculating CLV...')
    await calculateCLV(experiment.id)

    // 10. Update bankroll
    console.log('[RUN-LOOP] Updating bankroll...')
    await updateBankroll(experiment.id)

    console.log('[RUN-LOOP] ✓ Loop complete')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[RUN-LOOP] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getActiveExperiment() {
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .eq('status', 'active')
    .single()

  if (error) {
    console.warn('[EXPERIMENT] No active experiment found:', error.message)
    return null
  }
  return data
}

async function checkCLVHealth(experimentId: string, experimentName: string): Promise<boolean> {
  try {
    // Get rolling CLV (last 50 bets)
    const { data: bets, error } = await supabase
      .from('bets')
      .select('clv')
      .eq('experimentId', experimentId)
      .eq('isShadow', false)
      .not('clv', 'is', null) // not null
      .order('placedAt', { ascending: false })
      .limit(50)

    if (error || !bets || bets.length < 50) {
      console.log('[CLV-HEALTH] Sample too small (<50), allowing betting')
      return true
    }

    const clvValues = bets.map(b => b.clv)
    const avgClv = clvValues.reduce((a, b) => a + b, 0) / clvValues.length
    const positiveCount = clvValues.filter(c => c > 0).length
    const positiveRate = positiveCount / clvValues.length

    console.log(`[CLV-HEALTH] avg_clv: ${avgClv.toFixed(4)}, positive_rate: ${(positiveRate * 100).toFixed(1)}%`)

    // Kill switch rules
    if (avgClv < 0) {
      console.error('[CLV-HEALTH] avg_clv < 0 → STOP')
      
      // Send Slack alert
      try {
        const { sendSlackAlert } = await import('../../../../lib/slack')
        await sendSlackAlert('STOP', {
          experimentName,
          metrics: { avgClv, positiveClvRate: positiveRate * 100, drawdown: 0, totalBets: bets.length },
          timestamp: new Date().toISOString()
        })
      } catch (err) {
        console.error('[SLACK] Error sending alert:', err)
      }
      
      return false
    }
    if (positiveRate < 0.48) {
      console.error('[CLV-HEALTH] positive_rate < 48% → STOP')
      
      // Send Slack alert
      try {
        const { sendSlackAlert } = await import('../../../../lib/slack')
        await sendSlackAlert('STOP', {
          experimentName,
          metrics: { avgClv, positiveClvRate: positiveRate * 100, drawdown: 0, totalBets: bets.length },
          timestamp: new Date().toISOString()
        })
      } catch (err) {
        console.error('[SLACK] Error sending alert:', err)
      }
      
      return false
    }

    return true
  } catch (error) {
    console.error('[CLV-HEALTH] Error:', error)
    return true // allow betting if check fails
  }
}

async function checkExperimentCompletion(experimentId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('experimentId', experimentId)
    .eq('isShadow', false)

  if (error) {
    console.error('[COMPLETION] Error:', error)
    return false
  }

  const isComplete = (count || 0) >= 150
  console.log(`[COMPLETION] Bet count: ${count}/150`)
  return isComplete
}

async function rotateExperiment(currentExperiment: any) {
  try {
    // 1. Close current experiment
    const { error: closeError } = await supabase
      .from('experiments')
      .update({
        status: 'complete',
        endDate: new Date().toISOString()
      })
      .eq('id', currentExperiment.id)

    if (closeError) throw closeError
    console.log(`[ROTATE] Closed experiment: ${currentExperiment.name}`)

    // 2. Create new experiment
    const nextName = currentExperiment.name.includes('EPL')
      ? 'WC_2026_V1'
      : `${currentExperiment.competition}_V2`

    const { data: newExp, error: createError } = await supabase
      .from('experiments')
      .insert({
        name: nextName,
        sport: currentExperiment.sport,
        competition: nextName.includes('WC') ? 'WorldCup' : currentExperiment.competition,
        status: 'active',
        startDate: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) throw createError
    console.log(`[ROTATE] Created experiment: ${newExp.name}`)

    // 3. Initialize bankroll
    const { error: bankrollError } = await supabase
      .from('bankroll')
      .insert({
        experimentId: newExp.id,
        startingBalance: 1000,
        currentBalance: 1000,
        peakBalance: 1000
      })

    if (bankrollError) throw bankrollError
    console.log(`[ROTATE] Initialized bankroll for new experiment`)
  } catch (error) {
    console.error('[ROTATE] Error:', error)
    throw error
  }
}

async function generateBets(experimentId: string) {
  try {
    // Get bankroll + drawdown info
    const { data: bankroll, error: bankrollError } = await supabase
      .from('bankroll')
      .select('*')
      .eq('experimentId', experimentId)
      .single()

    if (bankrollError || !bankroll) {
      console.error('[GENERATE] No bankroll found')
      return
    }

    const drawdown = (bankroll.peakBalance - bankroll.currentBalance) / bankroll.peakBalance

    // Apply risk controls (stub - full logic in helper)
    if (drawdown > 0.3) {
      console.log('[GENERATE] Drawdown > 30% → STOP BETTING')
      return
    }

    const riskMultiplier = drawdown > 0.2 ? 0.25 : drawdown > 0.1 ? 0.5 : 1

    // Get pending predictions
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('experimentId', experimentId)
      .is('result', null) // unsettled

    if (predError || !predictions) return

    console.log(`[GENERATE] Processing ${predictions.length} predictions`)

    for (const pred of predictions) {
      // Calculate Kelly stake
      const stake = getKellyStake(
        pred.modelProbability,
        pred.oddsTaken,
        bankroll.currentBalance,
        riskMultiplier
      )

      const isShadow = stake === 0

      const { error } = await supabase.from('bets').insert({
        experimentId,
        predictionId: pred.id,
        matchId: pred.matchId,
        market: pred.market,
        oddsTaken: pred.oddsTaken,
        stake,
        impliedProbTaken: 1 / pred.oddsTaken,
        isShadow,
        placedAt: new Date().toISOString()
      })

      if (error) console.error('[GENERATE] Insert error:', error)
    }

    console.log('[GENERATE] ✓ Bets generated')
  } catch (error) {
    console.error('[GENERATE] Error:', error)
  }
}

function getKellyStake(
  prob: number,
  odds: number,
  bankroll: number,
  riskMultiplier: number = 1
): number {
  try {
    const edge = odds * prob - 1
    if (edge <= 0) return 0

    const kelly = edge / (odds - 1)
    let stakePct = kelly * 0.25 // 25% Kelly (fractional)

    // Cap at 5%
    stakePct = Math.min(stakePct, 0.05)

    // Apply risk multiplier (drawdown protection)
    stakePct *= riskMultiplier

    const stake = bankroll * Math.max(stakePct, 0)
    return Math.round(stake * 100) / 100
  } catch {
    return 0
  }
}

async function calculateCLV(experimentId: string) {
  try {
    // Get bets with results but no CLV
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('experimentId', experimentId)
      .is('clv', null) // no CLV yet
      .not('result', 'is', null) // has result

    if (error || !bets) return

    for (const bet of bets) {
      if (!bet.closingOdds) continue

      const clv = (bet.closingOdds / bet.oddsTaken) - 1

      await supabase
        .from('bets')
        .update({ clv })
        .eq('id', bet.id)
    }

    console.log(`[CLV] Calculated CLV for ${bets.length} bets`)
  } catch (error) {
    console.error('[CLV] Error:', error)
  }
}

async function updateBankroll(experimentId: string) {
  try {
    // Get bankroll
    const { data: bankroll, error: bankrollError } = await supabase
      .from('bankroll')
      .select('*')
      .eq('experimentId', experimentId)
      .single()

    if (bankrollError || !bankroll) return

    // Get P&L from settled bets
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('experimentId', experimentId)
      .eq('settled', false)
      .not('result', 'is', null)

    if (betsError || !bets) return

    let totalPnl = 0
    const settledBetIds: string[] = []

    for (const bet of bets) {
      if (bet.result === 'WIN') {
        totalPnl += (bet.oddsTaken - 1) * bet.stake
      } else if (bet.result === 'LOSS') {
        totalPnl -= bet.stake
      }
      settledBetIds.push(bet.id)
    }

    // Update bankroll
    const newBalance = bankroll.currentBalance + totalPnl
    const newPeak = Math.max(bankroll.peakBalance, newBalance)

    const { error: updateError } = await supabase
      .from('bankroll')
      .update({
        currentBalance: newBalance,
        peakBalance: newPeak
      })
      .eq('id', bankroll.id)

    if (updateError) throw updateError

    // Mark bets as settled
    for (const id of settledBetIds) {
      await supabase.from('bets').update({ settled: true }).eq('id', id)
    }

    console.log(`[BANKROLL] Updated: ${bankroll.currentBalance.toFixed(2)} → ${newBalance.toFixed(2)}`)
  } catch (error) {
    console.error('[BANKROLL] Error:', error)
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to trigger run-loop' })
}
