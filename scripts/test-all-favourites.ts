import { fetchEPLResults } from '../lib/ratings/fetch-results'

async function testAllTeamsFavourites() {
  const results = await fetchEPLResults(3)

  // Group by team when they're favourites (odds < 1.75)
  const teams = new Map<string, {
    matches: typeof results
    wins: number
    winRate: number
    impliedRate: number
    edge: number
  }>()

  const allTeams = new Set(results.flatMap(m => [m.homeTeam, m.awayTeam]))

  for (const team of allTeams) {
    const subset = results.filter(m =>
      m.homeTeam === team &&
      m.pinnacleHome !== null &&
      m.pinnacleHome < 1.75
    )

    if (subset.length < 15) continue // Need sufficient sample

    const wins = subset.filter(m => m.homeGoals > m.awayGoals).length
    const winRate = wins / subset.length
    const impliedRate = subset.reduce((sum, m) => sum + (1 / m.pinnacleHome!), 0) / subset.length
    const edge = winRate - impliedRate

    teams.set(team, {
      matches: subset,
      wins,
      winRate,
      impliedRate,
      edge
    })
  }

  // Sort by edge (biggest opportunities)
  const sorted = [...teams.entries()].sort((a, b) => b[1].edge - a[1].edge)

  console.log('=== FAVOURITES ANALYSIS (odds < 1.75) ===\n')
  console.log('Team'.padEnd(25) + ' | Sample | Win% | Implied% | Edge')
  console.log('-'.repeat(65))

  for (const [team, data] of sorted) {
    const edgePercent = (data.edge * 100).toFixed(1)
    const verdict = Math.abs(data.edge) > 0.03 ? (data.edge > 0 ? '📈' : '📉') : '  '
    console.log(
      `${verdict} ${team.padEnd(23)} | ${data.matches.length.toString().padStart(6)} | ${(data.winRate * 100).toFixed(0).padStart(3)}% | ${(data.impliedRate * 100).toFixed(0).padStart(7)}% | ${edgePercent.padStart(6)}%`
    )
  }

  console.log('\n📈 = Underpriced (win more than market expects)')
  console.log('📉 = Overpriced (win less than market expects)')
}

testAllTeamsFavourites().catch(console.error)
