/**
 * Poisson Model for Football Match Prediction
 * 
 * Uses attack/defence strengths to estimate expected goals,
 * then Poisson distribution to get win/draw/loss probabilities
 */

export interface TeamStrengths {
  name: string;
  attackStrength: number;  // goals scored / league average
  defenceStrength: number; // goals conceded / league average
}

export interface PoissonInput {
  homeTeam: TeamStrengths;
  awayTeam: TeamStrengths;
  leagueAvgGoals: number; // typically 1.4
}

export interface PoissonOutput {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeLambda: number;
  awayLambda: number;
}

/**
 * Poisson probability: P(X=k) = (λ^k * e^-λ) / k!
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

export function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Calculate expected goals (λ) for a team
 * 
 * λ = attack_strength * opponent_defence_strength * league_avg_goals
 */
function calculateLambda(
  attackStrength: number,
  opponentDefenceStrength: number,
  leagueAvgGoals: number
): number {
  return attackStrength * opponentDefenceStrength * leagueAvgGoals;
}

/**
 * Main Poisson model
 */
export function poissonModel(input: PoissonInput): PoissonOutput {
  const { homeTeam, awayTeam, leagueAvgGoals } = input;

  // Calculate expected goals
  const homeLambda = calculateLambda(
    homeTeam.attackStrength,
    awayTeam.defenceStrength,
    leagueAvgGoals
  );

  const awayLambda = calculateLambda(
    awayTeam.attackStrength,
    homeTeam.defenceStrength,
    leagueAvgGoals
  );

  // Calculate probabilities for all score combinations (0-5 goals)
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  for (let homeGoals = 0; homeGoals <= 5; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= 5; awayGoals++) {
      const prob = poisson(homeGoals, homeLambda) * poisson(awayGoals, awayLambda);

      if (homeGoals > awayGoals) {
        homeWinProb += prob;
      } else if (homeGoals === awayGoals) {
        drawProb += prob;
      } else {
        awayWinProb += prob;
      }
    }
  }

  return {
    homeWinProb: parseFloat(homeWinProb.toFixed(4)),
    drawProb: parseFloat(drawProb.toFixed(4)),
    awayWinProb: parseFloat(awayWinProb.toFixed(4)),
    homeLambda: parseFloat(homeLambda.toFixed(2)),
    awayLambda: parseFloat(awayLambda.toFixed(2)),
  };
}

/**
 * Calculate implied probability from odds
 * P = 1 / odds
 */
export function impliedProbability(odds: number): number {
  return 1 / odds;
}

/**
 * Calculate value: model_prob - implied_prob
 * Positive = value bet
 */
export function calculateValue(
  modelProb: number,
  odds: number
): number {
  const implied = impliedProbability(odds);
  return modelProb - implied;
}

/**
 * Helper to calculate team strengths from match history
 */
export function calculateTeamStrengths(
  avgGoalsScored: number,
  avgGodsConceded: number,
  leagueAvgGoals: number
): TeamStrengths {
  return {
    name: "",
    attackStrength: avgGoalsScored / leagueAvgGoals,
    defenceStrength: 1 / (avgGodsConceded / leagueAvgGoals), // inverted
  };
}
