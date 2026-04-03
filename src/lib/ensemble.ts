/**
 * Ensemble Model System
 *
 * Runs multiple specialized models in parallel
 * Each gets weight based on recent CLV performance
 * Dynamic capital allocation across models
 */

export interface EnsembleModel {
  name: string;
  description: string;
  filter: (prediction: any) => boolean; // Which predictions to use
  weight: number; // 0-1: allocation weight
  avgCLV: number;
  roiPercent: number;
  totalBets: number;
  successCount: number;
  lastUpdated: string;
}

export interface EnsembleConfig {
  models: EnsembleModel[];
  rebalanceInterval: number; // days
  minBetsForRebalance: number;
}

export class EnsembleManager {
  private models: Map<string, EnsembleModel> = new Map();
  private rebalanceHistory: Array<{ date: string; weights: Record<string, number> }> = [];

  constructor(config: EnsembleConfig) {
    config.models.forEach((m) => {
      this.models.set(m.name, { ...m, weight: 1 / config.models.length });
    });
  }

  /**
   * Get model by name
   */
  getModel(name: string): EnsembleModel | undefined {
    return this.models.get(name);
  }

  /**
   * Update model performance stats
   */
  updateModelPerformance(
    name: string,
    stats: {
      avgCLV: number;
      roiPercent: number;
      totalBets: number;
      successCount: number;
    }
  ): void {
    const model = this.models.get(name);
    if (model) {
      model.avgCLV = stats.avgCLV;
      model.roiPercent = stats.roiPercent;
      model.totalBets = stats.totalBets;
      model.successCount = stats.successCount;
      model.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Rebalance weights based on recent performance
   * Strong models get more capital, weak models fade
   */
  rebalanceWeights(): Record<string, number> {
    const modelArray = Array.from(this.models.values());

    // Calculate quality score: CLV + consistency
    const scores = modelArray.map((m) => ({
      name: m.name,
      score: Math.max(0, m.avgCLV * 100 + (m.successCount / Math.max(1, m.totalBets) - 0.5) * 50),
    }));

    // Normalize scores to weights
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const newWeights: Record<string, number> = {};

    scores.forEach((s) => {
      newWeights[s.name] = totalScore > 0 ? s.score / totalScore : 1 / modelArray.length;

      // Apply to model
      const model = this.models.get(s.name);
      if (model) {
        model.weight = newWeights[s.name];
      }
    });

    this.rebalanceHistory.push({
      date: new Date().toISOString(),
      weights: newWeights,
    });

    return newWeights;
  }

  /**
   * Select which model to use for a prediction
   * Uses multi-armed bandit (roulette wheel selection based on weights)
   */
  selectModel(): string {
    const models = Array.from(this.models.values());
    const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const model of models) {
      random -= model.weight;
      if (random <= 0) return model.name;
    }

    return models[models.length - 1].name;
  }

  /**
   * Filter models that can handle this prediction
   */
  getApplicableModels(prediction: any): EnsembleModel[] {
    return Array.from(this.models.values()).filter((m) => m.filter(prediction));
  }

  /**
   * Get all models sorted by weight
   */
  getModels(): EnsembleModel[] {
    return Array.from(this.models.values()).sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get current weights
   */
  getWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    this.models.forEach((m) => {
      weights[m.name] = m.weight;
    });
    return weights;
  }

  /**
   * Calculate ensemble prediction by averaging
   * Weighted by model performance
   */
  ensemblePredict(
    predictions: Array<{ modelName: string; signal: number }>
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    predictions.forEach((p) => {
      const model = this.models.get(p.modelName);
      if (model) {
        weightedSum += p.signal * model.weight;
        totalWeight += model.weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get rebalance history (for charting)
   */
  getRebalanceHistory(): Array<{ date: string; weights: Record<string, number> }> {
    return this.rebalanceHistory;
  }

  /**
   * Identify strong vs weak models
   */
  getPerformanceCategories(): {
    strong: EnsembleModel[];
    medium: EnsembleModel[];
    weak: EnsembleModel[];
  } {
    const models = Array.from(this.models.values());

    return {
      strong: models.filter((m) => m.avgCLV > 0.05),
      medium: models.filter((m) => m.avgCLV >= 0 && m.avgCLV <= 0.05),
      weak: models.filter((m) => m.avgCLV < 0),
    };
  }
}

/**
 * Create default ensemble with common market specializations
 */
export function createDefaultEnsemble(): EnsembleManager {
  const models = [
    {
      name: 'OU_Specialist',
      description: 'Specialized in Over/Under markets',
      filter: (p: any) => p.market === 'Over' || p.market === 'Under',
      weight: 0.25,
      avgCLV: 0,
      roiPercent: 0,
      totalBets: 0,
      successCount: 0,
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'BTTS_Specialist',
      description: 'Specialized in Both Teams to Score',
      filter: (p: any) => p.market === 'BTTS',
      weight: 0.25,
      avgCLV: 0,
      roiPercent: 0,
      totalBets: 0,
      successCount: 0,
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Moneyline_Specialist',
      description: 'Specialized in Win/Draw/Loss',
      filter: (p: any) => p.market === 'Moneyline' || p.market === '1X2',
      weight: 0.25,
      avgCLV: 0,
      roiPercent: 0,
      totalBets: 0,
      successCount: 0,
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'HighOdds_Specialist',
      description: 'Specialized in long-odds, high-variance plays',
      filter: (p: any) => p.odds && p.odds > 3,
      weight: 0.25,
      avgCLV: 0,
      roiPercent: 0,
      totalBets: 0,
      successCount: 0,
      lastUpdated: new Date().toISOString(),
    },
  ];

  return new EnsembleManager({
    models: models as EnsembleModel[],
    rebalanceInterval: 1,
    minBetsForRebalance: 20,
  });
}
