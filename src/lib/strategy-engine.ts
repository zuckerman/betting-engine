/**
 * Strategy Evolution System
 *
 * System learns which parameter combinations work best
 * Mutates strategies → tests in shadow → promotes winners
 * Creates continuous self-improvement loop
 */

export interface Strategy {
  id: string;
  name: string;
  version: number;
  parameters: StrategyParameters;
  status: 'active' | 'shadow' | 'archived' | 'failed';
  performance: StrategyPerformance;
  createdAt: string;
  testedAt?: string;
  promotedAt?: string;
  parentId?: string; // Which strategy was this mutated from?
}

export interface StrategyParameters {
  // Core edge filtering
  edgeMultiplier: number; // 0.8-1.2 (amplify or dampen edge signal)
  minEdge: number; // 1-10% (min edge to accept bet)
  maxEdge: number; // 5-20% (clip extreme edges)

  // Kelly sizing
  kellyFraction: number; // 0.1-0.5 (1/10 to 1/2 Kelly)
  
  // Market selectivity
  marketFilters: string[]; // Which markets to trade (BTTS, OU, etc)
  leagueFilters: string[]; // Which leagues (EPL, LaLiga, etc)
  
  // Probability thresholds
  minProbability: number; // 0.5-0.65
  
  // Risk management
  maxConcurrentBets: number; // 5-20 concurrent
  maxDrawdownTolerance: number; // 0.15-0.4 (15-40%)
  
  // Execution
  executionDelay: number; // ms to delay bet (for naturalness)
  stakeVariation: number; // 0-0.3 (randomize stake ±%)
}

export interface StrategyPerformance {
  totalBets: number;
  wins: number;
  avgCLV: number;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  consistency: number; // 0-1: how stable is performance?
}

/**
 * Default strategy (baseline)
 */
export function getDefaultStrategy(): StrategyParameters {
  return {
    edgeMultiplier: 1.0,
    minEdge: 2,
    maxEdge: 15,
    kellyFraction: 0.25,
    marketFilters: ['BTTS', 'Over', 'Under', 'Moneyline'],
    leagueFilters: ['EPL', 'LaLiga', 'Bundesliga'],
    minProbability: 0.55,
    maxConcurrentBets: 10,
    maxDrawdownTolerance: 0.25,
    executionDelay: 0,
    stakeVariation: 0,
  };
}

/**
 * Mutate a strategy with small random changes
 * Used to explore parameter space
 */
export function mutateStrategy(
  parent: StrategyParameters,
  mutationStrength: number = 0.1
): StrategyParameters {
  const mutate = (value: number, min: number, max: number): number => {
    // Small random change
    const change = (Math.random() - 0.5) * 2 * mutationStrength;
    const newValue = value * (1 + change);
    // Clamp to bounds
    return Math.max(min, Math.min(max, newValue));
  };

  return {
    edgeMultiplier: mutate(parent.edgeMultiplier, 0.8, 1.3),
    minEdge: mutate(parent.minEdge, 0.5, 10),
    maxEdge: mutate(parent.maxEdge, 5, 30),
    kellyFraction: mutate(parent.kellyFraction, 0.1, 0.5),
    marketFilters: parent.marketFilters, // Don't mutate filters for now
    leagueFilters: parent.leagueFilters,
    minProbability: mutate(parent.minProbability, 0.5, 0.7),
    maxConcurrentBets: Math.round(mutate(parent.maxConcurrentBets, 5, 25)),
    maxDrawdownTolerance: mutate(parent.maxDrawdownTolerance, 0.15, 0.4),
    executionDelay: Math.round(mutate(parent.executionDelay, 0, 300000)),
    stakeVariation: mutate(parent.stakeVariation, 0, 0.3),
  };
}

/**
 * Cross two strategies (breed them)
 * Takes best features from both
 */
export function crossoverStrategy(
  parent1: StrategyParameters,
  parent2: StrategyParameters
): StrategyParameters {
  const pick = () => (Math.random() < 0.5 ? parent1 : parent2);

  return {
    edgeMultiplier: pick().edgeMultiplier,
    minEdge: pick().minEdge,
    maxEdge: pick().maxEdge,
    kellyFraction: pick().kellyFraction,
    marketFilters: pick().marketFilters,
    leagueFilters: pick().leagueFilters,
    minProbability: pick().minProbability,
    maxConcurrentBets: pick().maxConcurrentBets,
    maxDrawdownTolerance: pick().maxDrawdownTolerance,
    executionDelay: pick().executionDelay,
    stakeVariation: pick().stakeVariation,
  };
}

/**
 * Score strategy quality for evolution
 * Higher score = more likely to survive
 */
export function scoreStrategy(performance: StrategyPerformance): number {
  if (performance.totalBets < 20) return 0; // Need minimum data

  // CLV is king, but reward consistency too
  const clvScore = Math.max(0, performance.avgCLV * 1000); // Scale CLV
  const consistencyScore = performance.consistency * 100; // Consistency bonus
  const riskScore = Math.max(0, 1 - performance.maxDrawdown) * 50; // Penalize risk

  return clvScore + consistencyScore + riskScore;
}

/**
 * Filter strategies by performance
 */
export function filterByPerformance(
  strategies: Strategy[],
  minSampleSize: number = 30
): {
  viable: Strategy[];
  promising: Strategy[];
  weak: Strategy[];
} {
  const viable = strategies.filter((s) => s.performance.totalBets >= minSampleSize);

  const avgCLV = viable.length > 0
    ? viable.reduce((sum, s) => sum + s.performance.avgCLV, 0) / viable.length
    : 0;

  const promising = viable.filter((s) => s.performance.avgCLV > avgCLV);
  const weak = viable.filter((s) => s.performance.avgCLV <= avgCLV);

  return { viable, promising, weak };
}

/**
 * Calculate consistency score (0-1)
 * How stable is the strategy over time?
 */
export function calculateConsistency(
  bets: Array<{ clv: number; result: 'win' | 'loss' }>
): number {
  if (bets.length < 20) return 0;

  // Split into windows
  const windowSize = Math.ceil(bets.length / 4);
  const windows: number[] = [];

  for (let i = 0; i < bets.length; i += windowSize) {
    const window = bets.slice(i, i + windowSize);
    const windowCLV = window.reduce((sum, b) => sum + b.clv, 0) / window.length;
    windows.push(windowCLV);
  }

  // Calculate variance across windows
  const meanCLV = windows.reduce((a, b) => a + b, 0) / windows.length;
  const variance = windows.reduce((sum, w) => sum + Math.pow(w - meanCLV, 2), 0) / windows.length;
  const stdDev = Math.sqrt(variance);

  // Lower variance = higher consistency (0-1)
  return Math.max(0, 1 - stdDev);
}

/**
 * Check if strategy violates hard safety rules
 */
export function validateStrategy(params: StrategyParameters): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (params.kellyFraction > 0.5) {
    violations.push('Kelly fraction too high (max 0.5)');
  }

  if (params.maxDrawdownTolerance > 0.4) {
    violations.push('Drawdown tolerance too high (max 40%)');
  }

  if (params.minEdge < 0.5) {
    violations.push('Min edge too low (min 0.5%)');
  }

  if (params.maxConcurrentBets > 25) {
    violations.push('Too many concurrent bets (max 25)');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Export/import strategies for persistence
 */
export function serializeStrategy(strategy: Strategy): string {
  return JSON.stringify(strategy);
}

export function deserializeStrategy(json: string): Strategy {
  return JSON.parse(json);
}

/**
 * Get strategy recommendations
 */
export function getStrategyRecommendation(strategy: Strategy): string {
  const { parameters, performance } = strategy;

  if (performance.totalBets < 20) {
    return '📊 Insufficient data (need ≥20 bets for evaluation)';
  }

  if (performance.avgCLV > 0.05) {
    return '✅ Strong edge (CLV > 5%) - consider increasing stake';
  } else if (performance.avgCLV > 0.01) {
    return '✓ Viable edge (CLV 1-5%) - continue testing';
  } else if (performance.avgCLV > -0.01) {
    return '⚠️ Marginal edge - needs more data or refinement';
  } else {
    return '❌ Losing strategy - consider retirement';
  }
}
