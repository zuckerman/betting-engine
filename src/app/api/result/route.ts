type ResultInput = {
  match_id: string
  home_goals: number
  away_goals: number
}

export async function POST(req: Request) {
  const data: ResultInput = await req.json()

  if (!data.match_id) {
    return Response.json({ error: "Missing match_id" }, { status: 400 })
  }

  if (data.home_goals === undefined || data.away_goals === undefined) {
    return Response.json({ error: "Missing home_goals or away_goals" }, { status: 400 })
  }

  const result =
    data.home_goals > data.away_goals
      ? "home"
      : data.home_goals < data.away_goals
      ? "away"
      : "draw"

  // TEMP: store in memory (no DB yet)
  globalThis.results = globalThis.results || {}
  globalThis.results[data.match_id] = {
    ...data,
    result
  }

  return Response.json({ success: true, result, match_id: data.match_id })
}
