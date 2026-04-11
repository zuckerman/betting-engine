import { fetchEPLResults } from '../lib/ratings/fetch-results'

async function testArsenalHypothesis() {
  const results = await fetchEPLResults(3) // 3 seasons of data

  // Arsenal matches where they're heavy home favourite (odds < 1.6)
  const subset = results.filter(m =>
    m.homeTeam === 'Arsenal' &&
    m.pinnacleHome !== null &&
    m.pinnacleHome < 1.6
  )

  if (subset.length < 20) {
    console.log(`Only ${subset.length} matches — insufficient sample`)
    return
  }

  const wins = subset.filter(m => m.homeGoals > m.awayGoals).length
  const observedWinRate = wins / subset.length
  const avgImplied = subset.reduce((sum, m) => sum + (1 / m.pinnacleHome!), 0) / subset.length
  const edge = observedWinRate - avgImplied

  console.log('--- ARSENAL OVERPRICED HYPOTHESIS ---')
  console.log(`Sample:            ${subset.length} matches`)
  console.log(`Observed win rate: ${(observedWinRate * 100).toFixed(1)}%`)
  console.log(`Market implied:    ${(avgImplied * 100).toFixed(1)}%`)
  console.log(`Edge:              ${(edge * 100).toFixed(1)}%`)
  console.log(`Verdict:           ${edge < -0.03 ? '✅ HYPOTHESIS SUPPORTED' : edge > 0.03 ? '❌ HYPOTHESIS REJECTED — actually underpriced' : '⚠️  INCONCLUSIVE — no meaningful difference'}`)

  // Break down by season for robustness check
  console.log('\n--- BY SEASON ---')
  const seasons = [...new Set(subset.map(m => m.date.slice(-2)))]
  for (const season of seasons) {
    const s = subset.filter(m => m.date.slice(-2) === season)
    const w = s.filter(m => m.homeGoals > m.awayGoals).length
    const impliedRate = s.reduce((sum, m) => sum + (1 / m.pinnacleHome!), 0) / s.length
    console.log(`20${season}: ${w}/${s.length} wins (${(w / s.length * 100).toFixed(0)}% observed vs ${(impliedRate * 100).toFixed(0)}% implied)`)
  }
}

testArsenalHypothesis().catch(console.error)
