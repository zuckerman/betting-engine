/**
 * GET /api/run/football
 * 
 * Semi-automated fixture fetching + prediction pipeline
 * - Fetches upcoming fixtures from Football-Data.org
 * - Generates predictions using Poisson model
 * - Returns predictions for manual result tracking
 */

export async function GET() {
  const apiKey = process.env.FOOTBALL_API_KEY

  if (!apiKey || apiKey === "your_api_key_here") {
    return Response.json(
      { error: "FOOTBALL_API_KEY not configured. Get one from football-data.org" },
      { status: 400 }
    )
  }

  try {
    // Fetch upcoming fixtures (Premier League)
    const fixturesRes = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED",
      {
        headers: { "X-Auth-Token": apiKey }
      }
    )

    if (!fixturesRes.ok) {
      return Response.json(
        { error: `API error: ${fixturesRes.statusText}` },
        { status: 500 }
      )
    }

    const fixturesData = await fixturesRes.json()
    const matches = fixturesData.matches.slice(0, 10) // Limit to 10 for testing

    if (matches.length === 0) {
      return Response.json({
        message: "No scheduled matches found",
        matches: []
      })
    }

    const predictions: any[] = []

    for (const match of matches) {
      const homeTeam = match.homeTeam.name
      const awayTeam = match.awayTeam.name

      // TEMP: Simple dummy stats (will be enhanced with real averages later)
      const predictionInput = {
        home_team: homeTeam,
        away_team: awayTeam,
        home_avg_scored: 1.6,
        home_avg_conceded: 1.2,
        away_avg_scored: 1.4,
        away_avg_conceded: 1.3,
        home_odds: 2.0,
        draw_odds: 3.2,
        away_odds: 3.5
      }

      // Call own prediction endpoint
      try {
        const predRes = await fetch("http://localhost:3002/api/predict/football", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(predictionInput)
        })

        if (predRes.ok) {
          const prediction = await predRes.json()
          predictions.push({
            match_id: prediction.match_id,
            fixture: {
              home: homeTeam,
              away: awayTeam,
              date: match.utcDate
            },
            prediction: {
              should_bet: prediction.should_bet,
              best_bet: prediction.best_bet,
              confidence: prediction.confidence,
              best_value: prediction.best_value,
              model: prediction.model,
              odds: prediction.odds
            }
          })
        }
      } catch (err) {
        console.error(`Error predicting ${homeTeam} vs ${awayTeam}:`, err)
      }
    }

    return Response.json({
      total_fixtures: matches.length,
      predictions_generated: predictions.length,
      predictions: predictions.filter(p => p.prediction.should_bet === true),
      all_predictions: predictions
    })
  } catch (error: any) {
    console.error("Fixture fetch error:", error)
    return Response.json(
      { error: error.message || "Failed to fetch fixtures" },
      { status: 500 }
    )
  }
}
