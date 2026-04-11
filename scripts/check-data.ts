import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function check() {
  console.log('=== CHECKING PREDICTION DATA ===\n')

  // Get all predictions
  const { data, error } = await supabase
    .from('predictions')
    .select('id, home_team, away_team, model_probability, odds_taken, edge, settled, closing_odds, clv, placed_at, match_id, result')
    .order('placed_at', { ascending: false })
    .limit(50)

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  console.log(`📊 Total predictions in DB: ${data?.length}`)

  // Categorize
  const realBets = data?.filter((r: any) => !r.match_id?.includes('seed') && !r.match_id?.includes('test')) || []
  const seededBets = data?.filter((r: any) => r.match_id?.includes('seed') || r.match_id?.includes('test')) || []

  console.log(`\n📈 Data sources:`)
  console.log(`   Real bets: ${realBets.length}`)
  console.log(`   Seeded: ${seededBets.length}`)

  // Check what's actually settled with closing odds
  const withClosingOdds = data?.filter((r: any) => r.closing_odds !== null && r.closing_odds !== undefined) || []
  console.log(`\n✅ Settled with closing_odds: ${withClosingOdds.length}`)

  // Show real bets that are settled
  const realSettled = realBets.filter((r: any) => r.closing_odds !== null && r.closing_odds !== undefined)
  console.log(`✅ Real bets settled: ${realSettled.length}`)

  if (realSettled.length > 0) {
    console.log('\n📋 Real settled bets (most recent):')
    realSettled.slice(0, 5).forEach((row: any, i: number) => {
      console.log(`\n[${i}] ${row.home_team} vs ${row.away_team}`)
      console.log(`    Model Prob: ${row.model_probability}`)
      console.log(`    Odds Taken: ${row.odds_taken}`)
      console.log(`    Edge: ${row.edge}`)
      console.log(`    Closing Odds: ${row.closing_odds}`)
      console.log(`    CLV: ${row.clv}`)
      console.log(`    Result: ${row.result}`)
      console.log(`    Match ID: ${row.match_id?.substring(0, 50)}`)
    })
  }

  // Show seeded bets for comparison
  console.log('\n\n📋 Seeded bets (for comparison - first 3):')
  seededBets.slice(0, 3).forEach((row: any, i: number) => {
    console.log(`\n[${i}] ${row.home_team} vs ${row.away_team}`)
    console.log(`    Edge: ${row.edge}`)
    console.log(`    Closing: ${row.closing_odds}`)
    console.log(`    CLV: ${row.clv}`)
    console.log(`    Match ID: ${row.match_id?.substring(0, 50)}`)
  })

  // Calibration check on REAL bets only
  if (realSettled.length > 0) {
    console.log('\n\n🎯 CALIBRATION CHECK (Real bets only):')
    
    const calibration = realSettled.map((r: any) => ({
      prob: r.model_probability,
      odds: r.odds_taken,
      edge: r.edge,
      won: r.result === 'WIN' ? 1 : 0
    }))

    const buckets = [
      { min: 0.40, max: 0.50, name: '40-50%' },
      { min: 0.50, max: 0.55, name: '50-55%' },
      { min: 0.55, max: 0.60, name: '55-60%' },
      { min: 0.60, max: 1.0, name: '60%+' }
    ]

    buckets.forEach(bucket => {
      const bets = calibration.filter(b => b.prob >= bucket.min && b.prob < bucket.max)
      if (bets.length > 0) {
        const wins = bets.filter(b => b.won).length
        const winRate = (wins / bets.length)
        console.log(`${bucket.name}: ${bets.length} bets, ${wins} wins, actual rate: ${(winRate * 100).toFixed(1)}%, expected: ${(bucket.min * 100).toFixed(0)}%`)
      }
    })
  } else {
    console.log('\n❌ No real settled bets found — cannot run calibration check')
  }

  // Edge pattern check
  console.log('\n\n🔍 EDGE BIAS CHECK:')
  console.log('(Model odds vs Market odds consistency)')
  
  const allBets = data?.map((r: any) => ({
    match: `${r.home_team} vs ${r.away_team}`,
    marketOdds: r.odds_taken,
    modelProb: r.model_probability,
    impliedModelOdds: 1 / r.model_probability,
    edge: r.edge
  })) || []

  if (allBets.length > 0) {
    const first5 = allBets.slice(0, 5)
    first5.forEach((b: any) => {
      const bias = ((b.impliedModelOdds - b.marketOdds) / b.marketOdds * 100).toFixed(2)
      console.log(`${b.match}: Market ${b.marketOdds.toFixed(2)}, Model implies ${b.impliedModelOdds.toFixed(2)} (${bias}% lower)`)
    })
  }
}

check().catch(console.error)
