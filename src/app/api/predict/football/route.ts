type MatchInput = {
  home_team: string
  away_team: string
  home_avg_scored: number
  home_avg_conceded: number
  away_avg_scored: number
  away_avg_conceded: number
  home_odds: number
  draw_odds: number
  away_odds: number
}

const LEAGUE_AVG_GOALS = 1.4

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1)
}

function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k)
}

export async function POST(req: Request) {
  const data: MatchInput = await req.json()

  // --- Validation ---
  if (!data.home_avg_scored || !data.home_avg_conceded || !data.away_avg_scored || !data.away_avg_conceded) {
    return Response.json({ error: "Missing required fields: home_avg_scored, home_avg_conceded, away_avg_scored, away_avg_conceded" }, { status: 400 })
  }
  if (!data.home_odds || !data.draw_odds || !data.away_odds) {
    return Response.json({ error: "Missing required fields: home_odds, draw_odds, away_odds" }, { status: 400 })
  }

  // --- Strengths ---
  const home_attack = data.home_avg_scored / LEAGUE_AVG_GOALS
  const home_defence = data.home_avg_conceded / LEAGUE_AVG_GOALS

  const away_attack = data.away_avg_scored / LEAGUE_AVG_GOALS
  const away_defence = data.away_avg_conceded / LEAGUE_AVG_GOALS

  // --- Expected goals ---
  const home_lambda = home_attack * away_defence * LEAGUE_AVG_GOALS
  const away_lambda = away_attack * home_defence * LEAGUE_AVG_GOALS

  let homeWin = 0
  let draw = 0
  let awayWin = 0

  // --- Score simulation ---
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const prob = poisson(i, home_lambda) * poisson(j, away_lambda)

      if (i > j) homeWin += prob
      else if (i === j) draw += prob
      else awayWin += prob
    }
  }

  // --- Odds → implied probability ---
  const impliedHome = 1 / data.home_odds
  const impliedDraw = 1 / data.draw_odds
  const impliedAway = 1 / data.away_odds

  // --- Value detection ---
  const value = {
    home: homeWin - impliedHome,
    draw: draw - impliedDraw,
    away: awayWin - impliedAway
  }

  // --- Confidence & Best Bet ---
  const confidence = Math.max(homeWin, draw, awayWin)
  
  let bestBet: "home" | "draw" | "away"
  let bestValue: number
  
  if (homeWin > draw && homeWin > awayWin) {
    bestBet = "home"
    bestValue = value.home
  } else if (awayWin > draw) {
    bestBet = "away"
    bestValue = value.away
  } else {
    bestBet = "draw"
    bestValue = value.draw
  }
  
  const shouldBet = confidence > 0.55 && bestValue > 0

  // --- Store prediction in memory ---
  const match_id = `${data.home_team}-${data.away_team}-${Date.now()}`
  
  globalThis.predictions = globalThis.predictions || {}
  globalThis.predictions[match_id] = {
    match_id,
    prediction: {
      homeWin: parseFloat(homeWin.toFixed(4)),
      draw: parseFloat(draw.toFixed(4)),
      awayWin: parseFloat(awayWin.toFixed(4))
    },
    odds: {
      home: data.home_odds,
      draw: data.draw_odds,
      away: data.away_odds
    },
    best_bet: bestBet,
    confidence,
    best_value: bestValue,
    should_bet: shouldBet
  }

  return Response.json({
    match_id,
    model: {
      home_win: parseFloat(homeWin.toFixed(4)),
      draw: parseFloat(draw.toFixed(4)),
      away_win: parseFloat(awayWin.toFixed(4)),
    },
    odds: {
      home: data.home_odds,
      draw: data.draw_odds,
      away: data.away_odds
    },
    implied: {
      home: parseFloat(impliedHome.toFixed(4)),
      draw: parseFloat(impliedDraw.toFixed(4)),
      away: parseFloat(impliedAway.toFixed(4)),
    },
    value: {
      home: parseFloat(value.home.toFixed(4)),
      draw: parseFloat(value.draw.toFixed(4)),
      away: parseFloat(value.away.toFixed(4)),
    },
    lambda: {
      home: parseFloat(home_lambda.toFixed(4)),
      away: parseFloat(away_lambda.toFixed(4)),
    },
    prob_sum: parseFloat((homeWin + draw + awayWin).toFixed(4)),
    best_bet: bestBet,
    confidence: parseFloat(confidence.toFixed(4)),
    best_value: parseFloat(bestValue.toFixed(4)),
    should_bet: shouldBet
  })
}
