/**
 * Sportmonks fixture result extraction
 * 
 * Fetches verified match results directly from Sportmonks API
 * with participants and scores included
 */

interface FixtureResult {
  fixture_id: number
  league_id: number
  home_team: string
  away_team: string
  home_goals: number
  away_goals: number
  result: "home_win" | "away_win" | "draw"
  status: number
  timestamp: string
}

export async function getFixtureResult(fixtureId: number): Promise<FixtureResult | null> {
  const apiKey = process.env.SPORTMONKS_API_KEY

  if (!apiKey) {
    throw new Error("SPORTMONKS_API_KEY not configured")
  }

  try {
    const url = `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}?api_token=${apiKey}&include=participants;scores`

    const res = await fetch(url)

    if (!res.ok) {
      console.error(`Sportmonks error: ${res.status} ${res.statusText}`)
      return null
    }

    const json = await res.json()
    const data = json.data

    // Extract home and away teams
    const home = data.participants.find((p: any) => p.meta.location === "home")
    const away = data.participants.find((p: any) => p.meta.location === "away")

    if (!home || !away) {
      console.error("Could not find home/away participants")
      return null
    }

    // Extract scores
    const scores = data.scores || []
    const homeScore = scores.find((s: any) => s.participant === "home")
    const awayScore = scores.find((s: any) => s.participant === "away")

    const homeGoals = homeScore?.score?.goals || 0
    const awayGoals = awayScore?.score?.goals || 0

    // Determine result
    let result: "home_win" | "away_win" | "draw"
    if (homeGoals > awayGoals) {
      result = "home_win"
    } else if (homeGoals < awayGoals) {
      result = "away_win"
    } else {
      result = "draw"
    }

    return {
      fixture_id: data.id,
      league_id: data.league_id,
      home_team: home.name,
      away_team: away.name,
      home_goals: homeGoals,
      away_goals: awayGoals,
      result,
      status: data.state_id,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error(`Error fetching fixture ${fixtureId}:`, error.message)
    return null
  }
}
