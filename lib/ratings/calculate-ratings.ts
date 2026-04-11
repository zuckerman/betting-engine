import type { MatchResult } from './fetch-results'

export interface TeamRating {
  team: string
  attack: number      // relative to league average (1.0 = average)
  defence: number     // higher = better (inverse of goals conceded ratio)
  homeAttack: number
  homeDefence: number
  awayAttack: number
  awayDefence: number
  gamesPlayed: number
  goalsFor: number
  goalsAgainst: number
}

export function calculateRatings(results: MatchResult[]): TeamRating[] {
  const teams = new Map<string, {
    homeGoalsFor: number[]
    homeGoalsAgainst: number[]
    awayGoalsFor: number[]
    awayGoalsAgainst: number[]
  }>()

  for (const match of results) {
    if (!teams.has(match.homeTeam)) {
      teams.set(match.homeTeam, {
        homeGoalsFor: [], homeGoalsAgainst: [],
        awayGoalsFor: [], awayGoalsAgainst: []
      })
    }
    if (!teams.has(match.awayTeam)) {
      teams.set(match.awayTeam, {
        homeGoalsFor: [], homeGoalsAgainst: [],
        awayGoalsFor: [], awayGoalsAgainst: []
      })
    }

    teams.get(match.homeTeam)!.homeGoalsFor.push(match.homeGoals)
    teams.get(match.homeTeam)!.homeGoalsAgainst.push(match.awayGoals)
    teams.get(match.awayTeam)!.awayGoalsFor.push(match.awayGoals)
    teams.get(match.awayTeam)!.awayGoalsAgainst.push(match.homeGoals)
  }

  // League averages (home and away separately — home advantage is real)
  const allHomeGoals = [...teams.values()].flatMap(t => t.homeGoalsFor)
  const allAwayGoals = [...teams.values()].flatMap(t => t.awayGoalsFor)
  const leagueHomeAvg = allHomeGoals.reduce((a, b) => a + b, 0) / allHomeGoals.length
  const leagueAwayAvg = allAwayGoals.reduce((a, b) => a + b, 0) / allAwayGoals.length

  const ratings: TeamRating[] = []

  for (const [team, data] of teams) {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 1.0

    const homeAttackRaw = avg(data.homeGoalsFor)
    const homeDefenceRaw = avg(data.homeGoalsAgainst)
    const awayAttackRaw = avg(data.awayGoalsFor)
    const awayDefenceRaw = avg(data.awayGoalsAgainst)

    const gamesPlayed =
      data.homeGoalsFor.length + data.awayGoalsFor.length

    ratings.push({
      team,
      // Normalised to league average
      attack: (homeAttackRaw / leagueHomeAvg + awayAttackRaw / leagueAwayAvg) / 2,
      defence: (leagueHomeAvg / (homeDefenceRaw || 0.01) + leagueAwayAvg / (awayDefenceRaw || 0.01)) / 2,
      homeAttack: homeAttackRaw / leagueHomeAvg,
      homeDefence: leagueHomeAvg / (homeDefenceRaw || 0.01),
      awayAttack: awayAttackRaw / leagueAwayAvg,
      awayDefence: leagueAwayAvg / (awayDefenceRaw || 0.01),
      gamesPlayed,
      goalsFor: data.homeGoalsFor.reduce((a, b) => a + b, 0) + data.awayGoalsFor.reduce((a, b) => a + b, 0),
      goalsAgainst: data.homeGoalsAgainst.reduce((a, b) => a + b, 0) + data.awayGoalsAgainst.reduce((a, b) => a + b, 0),
    })
  }

  return ratings.sort((a, b) => b.attack - a.attack)
}
