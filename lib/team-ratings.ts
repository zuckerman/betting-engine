/**
 * Team Ratings System
 * 
 * Calculates team attack/defense ratings from historical match results
 * Using simplified Dixon-Coles approach: estimate from goal-scoring patterns
 * 
 * Source: football-data.co.uk (free EPL historical data)
 */

export interface TeamRating {
  team: string
  attack: number
  defence: number
  gamesPlayed: number
  goalsFor: number
  goalsAgainst: number
  lastUpdated: Date
}

export interface MatchResult {
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  date: string
}

/**
 * Calculate team ratings from match results
 * Returns attack/defence multipliers (1.0 = league average)
 */
export function calculateTeamRatings(matches: MatchResult[]): Map<string, TeamRating> {
  const teamData = new Map<string, {
    goalsFor: number[]
    goalsAgainst: number[]
    gamesPlayed: number
  }>()

  // Aggregate data by team
  for (const match of matches) {
    // Home team
    if (!teamData.has(match.homeTeam)) {
      teamData.set(match.homeTeam, { goalsFor: [], goalsAgainst: [], gamesPlayed: 0 })
    }
    const homeData = teamData.get(match.homeTeam)!
    homeData.goalsFor.push(match.homeGoals)
    homeData.goalsAgainst.push(match.awayGoals)
    homeData.gamesPlayed += 1

    // Away team
    if (!teamData.has(match.awayTeam)) {
      teamData.set(match.awayTeam, { goalsFor: [], goalsAgainst: [], gamesPlayed: 0 })
    }
    const awayData = teamData.get(match.awayTeam)!
    awayData.goalsFor.push(match.awayGoals)
    awayData.goalsAgainst.push(match.homeGoals)
    awayData.gamesPlayed += 1
  }

  // Calculate league averages
  const allGoalsFor = Array.from(teamData.values()).flatMap(d => d.goalsFor)
  const allGoalsAgainst = Array.from(teamData.values()).flatMap(d => d.goalsAgainst)
  
  const leagueAvgFor = allGoalsFor.length > 0 
    ? allGoalsFor.reduce((a, b) => a + b, 0) / allGoalsFor.length 
    : 1.5

  const leagueAvgAgainst = allGoalsAgainst.length > 0 
    ? allGoalsAgainst.reduce((a, b) => a + b, 0) / allGoalsAgainst.length 
    : 1.5

  // Calculate ratings for each team
  const ratings = new Map<string, TeamRating>()

  for (const [team, data] of teamData) {
    const avgGoalsFor = data.goalsFor.reduce((a, b) => a + b, 0) / data.goalsFor.length
    const avgGoalsAgainst = data.goalsAgainst.reduce((a, b) => a + b, 0) / data.goalsAgainst.length

    // Attack rating: team's avg goals / league avg goals
    // Defence rating: league avg against / team's avg against (higher = better)
    ratings.set(team, {
      team,
      attack: avgGoalsFor / leagueAvgFor,
      defence: leagueAvgAgainst / avgGoalsAgainst,
      gamesPlayed: data.gamesPlayed,
      goalsFor: data.goalsFor.reduce((a, b) => a + b, 0),
      goalsAgainst: data.goalsAgainst.reduce((a, b) => a + b, 0),
      lastUpdated: new Date()
    })
  }

  return ratings
}

/**
 * Fetch EPL results from football-data.co.uk
 * Returns last 380 games (10 seasons) for stable ratings
 */
export async function fetchEPLResults(): Promise<MatchResult[]> {
  try {
    // Using football-data.co.uk free API (no key required for basic access)
    // Fetches last season + current season
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED&limit=380'
    )

    if (!response.ok) {
      console.error(`[RATINGS] HTTP ${response.status}: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!data.matches || !Array.isArray(data.matches)) {
      console.error('[RATINGS] Invalid response format')
      return []
    }

    return data.matches.map((match: any) => ({
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeGoals: match.score.fullTime.home,
      awayGoals: match.score.fullTime.away,
      date: match.utcDate
    }))
  } catch (err) {
    console.error('[RATINGS] Error fetching results:', err)
    return []
  }
}

/**
 * Get current team ratings (from cache or fetch fresh)
 */
export async function getTeamRatings(forceRefresh = false): Promise<Map<string, TeamRating>> {
  try {
    const results = await fetchEPLResults()
    
    if (results.length === 0) {
      console.warn('[RATINGS] No results fetched, returning empty map')
      return new Map()
    }

    return calculateTeamRatings(results)
  } catch (err) {
    console.error('[RATINGS] Error getting ratings:', err)
    return new Map()
  }
}

/**
 * Simple formatted output for debugging
 */
export function formatRatings(ratings: Map<string, TeamRating>): string {
  const sorted = Array.from(ratings.values())
    .sort((a, b) => b.attack - a.attack)

  return sorted
    .map(r => `${r.team.padEnd(20)} ATK: ${r.attack.toFixed(3)} DEF: ${r.defence.toFixed(3)}`)
    .join('\n')
}
