/**
 * Strategy Evolution Orchestrator
 *
 * Manages the complete self-improvement loop:
 * Generate → Test → Evaluate → Promote
 *
 * Runs autonomously with minimal human intervention
 */

import {
  Strategy,
  StrategyParameters,
  mutateStrategy,
  crossoverStrategy,
  scoreStrategy,
  calculateConsistency,
  validateStrategy,
} from './strategy-engine';
import { EdgeHealthMetrics, detectEdgeHealth } from './edge-decay';

export interface EvolutionConfig {
  generationInterval: number; // ms between strategy generations
  testingDuration: number; // bets to collect before evaluation
  promotionThreshold: number; // CLV improvement needed to promote
  maxActiveStrategies: number; // How many strategies to test simultaneously
  explorationRate: number; // 0-1: how much to explore vs exploit
}

export const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  generationInterval: 86400000, // Daily
  testingDuration: 50, // 50 bets per test
  promotionThreshold: 0.01, // 1% CLV improvement
  maxActiveStrategies: 5,
  explorationRate: 0.2, // 20% exploration
};

export interface EvolutionStats {
  generation: number;
  activeShadows: number;
  pendingPromotion: Strategy[];
  promotedToday: Strategy[];
  retired: Strategy[];
  evolutionHealth: number; // 0-1: diversity of strategies
}

/**
 * Core evolution engine
 */
export class StrategyEvolver {
  private strategies: Map<string, Strategy> = new Map();
  private generation: number = 0;
  private config: EvolutionConfig;
  private lastGenerationTime: number = 0;

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  /**
   * Generate new strategy variant
   * Either mutate existing or crossover two strategies
   */
  generateNewStrategy(
    activeStrategies: Strategy[],
    edgeHealth: EdgeHealthMetrics
  ): Strategy {
    let variant: StrategyParameters;

    if (activeStrategies.length === 0) {
      // First strategy - use default
      variant = this.getDefaultStrategy();
    } else if (Math.random() < 0.5 && activeStrategies.length > 1) {
      // Crossover two best strategies
      const sorted = activeStrategies.sort(
        (a, b) => scoreStrategy(b.performance) - scoreStrategy(a.performance)
      );
      variant = crossoverStrategy(sorted[0].parameters, sorted[1].parameters);
    } else {
      // Mutate best strategy
      const best = activeStrategies.reduce((prev, current) =>
        scoreStrategy(current.performance) > scoreStrategy(prev.performance) ? current : prev
      );

      // Stronger mutations when edge decaying
      const mutationStrength = 0.1 * edgeHealth.explorationMultiplier;
      variant = mutateStrategy(best.parameters, mutationStrength);
    }

    // Validate
    const validation = validateStrategy(variant);
    if (!validation.valid) {
      // If invalid, use previous best
      const best = activeStrategies[0];
      variant = best?.parameters || this.getDefaultStrategy();
    }

    const newStrategy: Strategy = {
      id: `strat_${Date.now()}`,
      name: `Gen${this.generation}_${Math.random().toString(36).substring(7)}`,
      version: this.generation,
      parameters: variant,
      status: 'shadow',
      performance: {
        totalBets: 0,
        wins: 0,
        avgCLV: 0,
        roi: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        consistency: 0,
      },
      createdAt: new Date().toISOString(),
      parentId: activeStrategies[0]?.id,
    };

    return newStrategy;
  }

  /**
   * Register strategy for tracking
   */
  addStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Update strategy performance after testing period
   */
  updateStrategyPerformance(
    strategyId: string,
    bets: Array<{
      clv: number;
      result: 'win' | 'loss';
      stake: number;
      odds: number;
    }>
  ): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    const wins = bets.filter((b) => b.result === 'win').length;
    const avgCLV = bets.length > 0 ? bets.reduce((sum, b) => sum + b.clv, 0) / bets.length : 0;

    // Calculate ROI
    const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalReturn = bets.reduce(
      (sum, b) => sum + (b.result === 'win' ? b.stake * (b.odds - 1) : -b.stake),
      0
    );
    const roi = (totalReturn / totalStake) * 100;

    // Calculate Sharpe ratio
    const returns = bets.map((b) =>
      b.result === 'win' ? b.stake * (b.odds - 1) : -b.stake
    );
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    returns.forEach((r) => {
      cumulative += r;
      peak = Math.max(peak, cumulative);
      maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    });

    // Calculate consistency
    const consistency = calculateConsistency(
      bets.map((b) => ({ clv: b.clv, result: b.result }))
    );

    strategy.performance = {
      totalBets: bets.length,
      wins,
      avgCLV,
      roi,
      sharpeRatio,
      maxDrawdown: maxDrawdown / totalStake,
      consistency,
    };

    strategy.testedAt = new Date().toISOString();
  }

  /**
   * Evaluate if strategy should be promoted
   */
  shouldPromote(
    candidate: Strategy,
    current: Strategy,
    promotionThreshold: number = this.config.promotionThreshold
  ): boolean {
    // Need minimum data
    if (candidate.performance.totalBets < this.config.testingDuration) {
      return false;
    }

    // CLV improvement check
    const clvImprovement = candidate.performance.avgCLV - current.performance.avgCLV;
    if (clvImprovement < promotionThreshold) {
      return false;
    }

    // Consistency check
    if (candidate.performance.consistency < current.performance.consistency - 0.1) {
      return false; // Too much worse on consistency
    }

    // Risk check
    if (candidate.performance.maxDrawdown > current.performance.maxDrawdown * 1.5) {
      return false; // Too risky
    }

    return true;
  }

  /**
   * Promote strategy to active
   */
  promoteStrategy(strategyId: string, currentActiveId: string): Strategy | null {
    const candidate = this.strategies.get(strategyId);
    const current = this.strategies.get(currentActiveId);

    if (!candidate || !current) return null;

    if (!this.shouldPromote(candidate, current)) {
      return null;
    }

    // Archive old active
    const oldActive = this.strategies.get(currentActiveId);
    if (oldActive) {
      oldActive.status = 'archived';
    }

    // Promote candidate
    candidate.status = 'active';
    candidate.promotedAt = new Date().toISOString();

    return candidate;
  }

  /**
   * Get shadow strategies (in testing)
   */
  getShadowStrategies(): Strategy[] {
    return Array.from(this.strategies.values()).filter((s) => s.status === 'shadow');
  }

  /**
   * Get active strategy
   */
  getActiveStrategy(): Strategy | null {
    const active = Array.from(this.strategies.values()).find((s) => s.status === 'active');
    return active || null;
  }

  /**
   * Get evolution stats
   */
  getStats(): EvolutionStats {
    const all = Array.from(this.strategies.values());
    const shadows = all.filter((s) => s.status === 'shadow');

    // Calculate diversity
    const scores = all.map((s) => scoreStrategy(s.performance));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const diversity = Math.min(1, Math.sqrt(variance) / Math.max(1, avgScore));

    return {
      generation: this.generation,
      activeShadows: shadows.length,
      pendingPromotion: shadows.filter((s) => s.performance.totalBets >= this.config.testingDuration),
      promotedToday: all.filter((s) => s.promotedAt && s.status === 'active'),
      retired: all.filter((s) => s.status === 'archived'),
      evolutionHealth: diversity,
    };
  }

  /**
   * Trigger generation cycle
   */
  nextGeneration(): void {
    this.generation++;
    this.lastGenerationTime = Date.now();
  }

  /**
   * Get strategy parameters with stealth applied
   */
  getStealthParameters(params: StrategyParameters): StrategyParameters {
    return {
      ...params,
      executionDelay: Math.round(params.executionDelay + Math.random() * 60000), // Add randomness
      stakeVariation: Math.min(0.5, params.stakeVariation + Math.random() * 0.1), // Vary stakes
    };
  }

  private getDefaultStrategy(): StrategyParameters {
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
}

/**
 * Evaluate portfolio of strategies
 * How should capital be allocated?
 */
export function allocateCapital(
  strategies: Strategy[],
  totalCapital: number
): Record<string, number> {
  const allocation: Record<string, number> = {};

  const activeStrategy = strategies.find((s) => s.status === 'active');
  if (!activeStrategy) return allocation;

  // Active gets bulk of capital
  allocation[activeStrategy.id] = totalCapital * 0.7; // 70% to active

  // Shadows split remaining
  const shadows = strategies.filter((s) => s.status === 'shadow');
  const shadowCapital = totalCapital * 0.3;
  const perShadow = shadowCapital / Math.max(1, shadows.length);

  shadows.forEach((s) => {
    allocation[s.id] = perShadow;
  });

  return allocation;
}
