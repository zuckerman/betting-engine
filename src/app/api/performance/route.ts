export async function GET() {
  const predictions = globalThis.predictions || {}
  const results = globalThis.results || {}

  let total = 0
  let bets = 0
  let correct = 0
  let profit = 0
  let totalOdds = 0
  let minOdds = Infinity
  let maxOdds = 0

  for (const id in predictions) {
    const p = predictions[id]
    const r = results[id]

    if (!r) continue

    total++

    // Only count predictions that we would have bet on
    if (!p.should_bet) continue

    bets++

    const odds = p.odds[p.best_bet]
    totalOdds += odds
    minOdds = Math.min(minOdds, odds)
    maxOdds = Math.max(maxOdds, odds)

    if (p.best_bet === r.result) {
      correct++
      profit += odds - 1
    } else {
      profit -= 1
    }
  }

  const avgOdds = bets ? parseFloat((totalOdds / bets).toFixed(2)) : 0

  return Response.json({
    total_matches: total,
    bets_placed: bets,
    accuracy: bets ? parseFloat((correct / bets).toFixed(4)) : 0,
    correct: correct,
    profit: parseFloat(profit.toFixed(4)),
    roi: bets ? parseFloat((profit / bets).toFixed(4)) : 0,
    bet_frequency: total ? parseFloat((bets / total).toFixed(2)) : 0,
    avg_odds: avgOdds,
    min_odds: minOdds === Infinity ? 0 : parseFloat(minOdds.toFixed(2)),
    max_odds: parseFloat(maxOdds.toFixed(2))
  })
}
