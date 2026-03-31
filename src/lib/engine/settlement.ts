/**
 * Settlement result extraction
 * Converts Sportmonks data to your engine format
 */

export interface SettlementResult {
  fixture_id: number
  league_id: number
  home_team: string
  away_team: string
  home_goals: number
  away_goals: number
  result: "home_win" | "away_win" | "draw"
  status: number
}

export function extractResult(data: any): SettlementResult {
  const fixture = data.data

  const home = fixture.participants.find((p: any) => p.meta.location === "home")
  const away = fixture.participants.find((p: any) => p.meta.location === "away")

  if (!home || !away) {
    throw new Error("Could not find home/away participants")
  }

  const scores = fixture.scores || []

  const homeGoals =
    scores.find((s: any) => s.participant === "home")?.score?.goals ?? 0

  const awayGoals =
    scores.find((s: any) => s.participant === "away")?.score?.goals ?? 0

  let result: "home_win" | "away_win" | "draw" = "draw"

  if (homeGoals > awayGoals) result = "home_win"
  if (awayGoals > homeGoals) result = "away_win"

  return {
    fixture_id: fixture.id,
    league_id: fixture.league_id,
    home_team: home.name,
    away_team: away.name,
    home_goals: homeGoals,
    away_goals: awayGoals,
    result,
    status: fixture.state_id
  }
}
