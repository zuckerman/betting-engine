/**
 * Meta-Model System
 *
 * Learns to predict when your main model will be WRONG
 * Uses logistic regression + reinforcement learning
 *
 * GOAL: Don't predict bets... predict prediction QUALITY
 * If meta-model says "80% chance this fails" → skip it
 */

export interface ModelWeights {
  bias: number;
  edge: number;
  odds: number;
  probability: number;
  market: Record<string, number>; // Encoded market types
  league: Record<string, number>; // Encoded leagues
}

export interface PredictionQualityScore {
  score: number; // 0-1: probability prediction is good
  recommendation: 'strong' | 'medium' | 'weak' | 'skip';
  reasoning: string;
}

export interface TrainingBatch {
  predictions: Array<{
    edge: number;
    odds: number;
    probability: number;
    market: string;
    league: string;
    clv: number; // Label: good if > 0, bad if < 0
  }>;
}

/**
 * Sigmoid function for logistic regression
 */
function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Default weights (can be tuned)
 * These are initial guesses that improve over time
 */
export function getDefaultWeights(): ModelWeights {
  return {
    bias: -0.5,
    edge: 0.4, // Higher edge = higher quality
    odds: -0.2, // Higher odds = lower quality (more variance)
    probability: 0.8, // Higher probability = higher quality
    market: {
      BTTS: 0.1, // BTTS is tricky
      Over: 0,
      Under: 0,
      Moneyline: 0.15,
      '1X2': 0.05,
    },
    league: {
      EPL: 0.1,
      LaLiga: 0.05,
      Bundesliga: 0,
      SerieA: -0.05,
      Ligue1: -0.1,
    },
  };
}

/**
 * Predict quality of a single prediction
 * Returns probability that this prediction will beat the market
 */
export function predictQuality(
  prediction: {
    edge: number;
    odds: number;
    probability: number;
    market: string;
    league: string;
  },
  weights: ModelWeights
): number {
  let z = weights.bias;

  z += weights.edge * prediction.edge;
  z += weights.odds * prediction.odds;
  z += weights.probability * prediction.probability;

  // Market encoding
  const marketWeight = weights.market[prediction.market] || 0;
  z += marketWeight;

  // League encoding
  const leagueWeight = weights.league[prediction.league] || 0;
  z += leagueWeight;

  return sigmoid(z);
}

/**
 * Score a prediction (returns recommendation)
 */
export function scoreQuality(
  prediction: {
    edge: number;
    odds: number;
    probability: number;
    market: string;
    league: string;
  },
  weights: ModelWeights,
  thresholds = { strong: 0.7, medium: 0.55, weak: 0.4 }
): PredictionQualityScore {
  const score = predictQuality(prediction, weights);

  let recommendation: 'strong' | 'medium' | 'weak' | 'skip';
  let reasoning = '';

  if (score >= thresholds.strong) {
    recommendation = 'strong';
    reasoning = `High confidence (${(score * 100).toFixed(0)}%) - strong signal`;
  } else if (score >= thresholds.medium) {
    recommendation = 'medium';
    reasoning = `Moderate confidence (${(score * 100).toFixed(0)}%) - acceptable bet`;
  } else if (score >= thresholds.weak) {
    recommendation = 'weak';
    reasoning = `Low confidence (${(score * 100).toFixed(0)}%) - consider skipping`;
  } else {
    recommendation = 'skip';
    reasoning = `Very low confidence (${(score * 100).toFixed(0)}%) - skip this`;
  }

  return {
    score,
    recommendation,
    reasoning,
  };
}

/**
 * Train meta-model using reinforcement learning
 * Updates weights based on prediction outcomes
 */
export function trainOnBatch(
  batch: TrainingBatch,
  currentWeights: ModelWeights,
  learningRate: number = 0.005
): ModelWeights {
  const updated = { ...currentWeights };
  const marketUpdates: Record<string, number> = {};
  const leagueUpdates: Record<string, number> = {};

  batch.predictions.forEach((pred) => {
    const predicted = predictQuality(pred, currentWeights);

    // Reward: positive CLV is good, negative is bad
    // Scale reward to 0-1 range
    const reward = Math.tanh(pred.clv * 10); // -1 to 1

    // Error: how far we were from the truth
    const error = reward - (predicted * 2 - 1); // Normalize predicted to -1 to 1

    // Update weights proportionally to error and feature value
    updated.bias += learningRate * error;
    updated.edge += learningRate * error * pred.edge;
    updated.odds += learningRate * error * pred.odds;
    updated.probability += learningRate * error * pred.probability;

    // Track market-specific updates
    if (!marketUpdates[pred.market]) marketUpdates[pred.market] = 0;
    marketUpdates[pred.market] += learningRate * error;

    // Track league-specific updates
    if (!leagueUpdates[pred.league]) leagueUpdates[pred.league] = 0;
    leagueUpdates[pred.league] += learningRate * error;
  });

  // Apply market updates
  Object.entries(marketUpdates).forEach(([market, delta]) => {
    if (!updated.market[market]) updated.market[market] = 0;
    updated.market[market] += delta;
  });

  // Apply league updates
  Object.entries(leagueUpdates).forEach(([league, delta]) => {
    if (!updated.league[league]) updated.league[league] = 0;
    updated.league[league] += delta;
  });

  // Apply bounds (prevent exploding weights)
  const bounded = boundWeights(updated);

  return bounded;
}

/**
 * Prevent weights from exploding
 */
function boundWeights(weights: ModelWeights): ModelWeights {
  const clamp = (v: number) => Math.max(-2, Math.min(2, v));

  return {
    bias: clamp(weights.bias),
    edge: clamp(weights.edge),
    odds: clamp(weights.odds),
    probability: clamp(weights.probability),
    market: Object.fromEntries(
      Object.entries(weights.market).map(([k, v]) => [k, clamp(v)])
    ),
    league: Object.fromEntries(
      Object.entries(weights.league).map(([k, v]) => [k, clamp(v)])
    ),
  };
}

/**
 * Calculate feature importance
 * Shows what drives prediction quality decisions
 */
export function getFeatureImportance(batch: TrainingBatch): {
  edge: number;
  odds: number;
  probability: number;
  market: number;
  league: number;
} {
  let edgeContribution = 0;
  let oddsContribution = 0;
  let probabilityContribution = 0;
  let marketContribution = 0;
  let leagueContribution = 0;

  batch.predictions.forEach((pred) => {
    const absClv = Math.abs(pred.clv);

    edgeContribution += Math.abs(pred.edge) * absClv;
    oddsContribution += Math.abs(pred.odds) * absClv;
    probabilityContribution += Math.abs(pred.probability) * absClv;
    marketContribution += 1 * absClv; // Market impact
    leagueContribution += 1 * absClv; // League impact
  });

  const total =
    edgeContribution +
    oddsContribution +
    probabilityContribution +
    marketContribution +
    leagueContribution;

  return {
    edge: edgeContribution / total,
    odds: oddsContribution / total,
    probability: probabilityContribution / total,
    market: marketContribution / total,
    league: leagueContribution / total,
  };
}

/**
 * Batch filter: remove low-quality predictions
 */
export function filterBatch(
  predictions: Array<{
    edge: number;
    odds: number;
    probability: number;
    market: string;
    league: string;
  }>,
  weights: ModelWeights,
  minScore: number = 0.55
): Array<{
  edge: number;
  odds: number;
  probability: number;
  market: string;
  league: string;
}> {
  return predictions.filter((pred) => {
    const score = predictQuality(pred, weights);
    return score >= minScore;
  });
}

/**
 * Export weights for persistence
 */
export function serializeWeights(weights: ModelWeights): string {
  return JSON.stringify(weights);
}

export function deserializeWeights(json: string): ModelWeights {
  return JSON.parse(json);
}
