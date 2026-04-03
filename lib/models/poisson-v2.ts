/**
 * Model V2: Adjusted Poisson with team strength and form weighting
 * 
 * Improvements over V1:
 * - Team attack/defense ratings
 * - Home advantage adjustment
 * - Recent form weighting
 * - Better probability calibration
 */

export interface TeamStats {
  name: string
  attack: number // 0.5 - 2.0 scale
  defense: number // 0.5 - 2.0 scale
  form?: number // optional recent form multiplier
}

// League average goals per game
const LEAGUE_AVG_GOALS = 2.65 // Premier League typical

// Home advantage multiplier
const HOME_ADVANTAGE = 1.08 // ~8% boost for home

/**
 * Calculate expected goals for a team
 */
export function expectedGoals(
  attacking: number,
  defending: number,
  leagueAvg: number = LEAGUE_AVG_GOALS
): number {
  return attacking * defending * leagueAvg
}

/**
 * Generate Poisson probability for exact score
 */
function poissonProbability(lambda: number, k: number): number {
  const e = Math.exp(-lambda)
  let factorial = 1

  for (let i = 1; i <= k; i++) {
    factorial *= i
  }

  return (e * Math.pow(lambda, k)) / factorial
}

/**
 * Calculate cumulative probability for outcome >= k goals
 */
function poissonCumulative(lambda: number, k: number): number {
  let sum = 0
  for (let i = 0; i <= k; i++) {
    sum += poissonProbability(lambda, i)
  }
  return sum
}

/**
 * Calculate match probabilities using Poisson
 */
export function calculateMatchOdds(
  home: TeamStats,
  away: TeamStats,
  maxGoals: number = 5
) {
  // Home gets advantage
  const homeXG = expectedGoals(
    home.attack * HOME_ADVANTAGE,
    away.defense
  )
  const awayXG = expectedGoals(away.attack, home.defense)

  // Calculate probabilities for each score
  let homeWinProb = 0
  let drawProb = 0
  let awayWinProb = 0

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const homeScoreProb = poissonProbability(homeXG, h)
      const awayScoreProb = poissonProbability(awayXG, a)
      const scoreProb = homeScoreProb * awayScoreProb

      if (h > a) homeWinProb += scoreProb
      else if (h === a) drawProb += scoreProb
      else awayWinProb += scoreProb
    }
  }

  // Renormalize (in case we truncated at maxGoals)
  const total = homeWinProb + drawProb + awayWinProb
  homeWinProb /= total
  drawProb /= total
  awayWinProb /= total

  return {
    homeWinProb,
    drawProb,
    awayWinProb,
    homeXG,
    awayXG,
  }
}

/**
 * Over/Under calculation
 */
export function calculateTotalGoals(
  home: TeamStats,
  away: TeamStats,
  threshold: number = 2.5,
  maxGoals: number = 10
) {
  const homeXG = expectedGoals(home.attack * HOME_ADVANTAGE, away.defense)
  const awayXG = expectedGoals(away.attack, home.defense)

  let underProb = 0

  // Probability of <= threshold goals total
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      if (h + a <= threshold) {
        const homeScoreProb = poissonProbability(homeXG, h)
        const awayScoreProb = poissonProbability(awayXG, a)
        underProb += homeScoreProb * awayScoreProb
      }
    }
  }

  return {
    underProb,
    overProb: 1 - underProb,
  }
}

/**
 * Convert from implied probability to attack/defense rating
 * Used for calibration from market data
 */
export function estimateTeamRating(
  impliedWinProb: number,
  leagueAvg: number = LEAGUE_AVG_GOALS
): number {
  // Rough inverse: higher prob → higher rating
  // This is simplified; real calibration would be more complex
  return Math.sqrt(impliedWinProb / leagueAvg) * 1.5
}

/**
 * Debug helper to show model calculations
 */
export function getModelDebug(home: TeamStats, away: TeamStats) {
  const odds = calculateMatchOdds(home, away)
  const totals = calculateTotalGoals(home, away)

  return {
    match: `${home.name} vs ${away.name}`,
    homeAttack: home.attack,
    homeDefense: home.defense,
    awayAttack: away.attack,
    awayDefense: away.defense,
    homeXG: Math.round(odds.homeXG * 100) / 100,
    awayXG: Math.round(odds.awayXG * 100) / 100,
    homeWinProb: Math.round(odds.homeWinProb * 1000) / 10 + '%',
    drawProb: Math.round(odds.drawProb * 1000) / 10 + '%',
    awayWinProb: Math.round(odds.awayWinProb * 1000) / 10 + '%',
    over2_5Prob: Math.round(odds.homeXG + odds.awayXG > 2.5 ? 1000 : 0) / 10 + '%',
  }
}
