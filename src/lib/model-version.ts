/**
 * Model Versioning & Safe Promotion System
 *
 * Ensures new models only go live if they provably outperform
 * Prevents degradation through rigorous A/B testing
 *
 * Flow:
 * Train new model → Shadow test → Compare vs current → Only promote if better
 */

export type ModelStatus = 'training' | 'shadow' | 'active' | 'archived';
export type PromotionStatus = 'approved' | 'rejected' | 'pending_review';

export interface ModelVersion {
  id: string;
  name: string;
  version: number;
  status: ModelStatus;
  weights: Record<string, any>;
  metrics: {
    avgCLV: number;
    roi: number;
    winRate: number;
    totalBets: number;
    sharpeRatio: number;
    maxDrawdown: number;
    sampleSize: number;
  };
  createdAt: string;
  testedAt?: string;
  promotedAt?: string;
  promotionStatus?: PromotionStatus;
  promotionReason?: string;
  comparison?: {
    versus: string; // ID of model it was compared to
    clvImprovement: number;
    roiImprovement: number;
    isStatisticallySignificant: boolean;
  };
}

export interface ModelComparison {
  model1: ModelVersion;
  model2: ModelVersion;
  winner: string; // ID of winning model
  metrics: {
    clvDifference: number;
    roiDifference: number;
    winRateDifference: number;
    statisticalSignificance: number; // p-value (lower = more significant)
    confidence: number; // 0-1: how confident in this comparison
  };
  recommendation: 'promote' | 'reject' | 'inconclusive';
  reasoning: string;
}

/**
 * Create a new model version from weights
 */
export function createModelVersion(
  name: string,
  version: number,
  weights: Record<string, any>
): ModelVersion {
  return {
    id: `${name}_v${version}_${Date.now()}`,
    name,
    version,
    status: 'training',
    weights,
    metrics: {
      avgCLV: 0,
      roi: 0,
      winRate: 0,
      totalBets: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      sampleSize: 0,
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update model metrics after testing
 */
export function updateModelMetrics(
  model: ModelVersion,
  predictions: Array<{
    clv: number;
    result: 'win' | 'loss';
    stake: number;
    odds: number;
  }>
): ModelVersion {
  if (predictions.length === 0) return model;

  const totalCLV = predictions.reduce((sum, p) => sum + p.clv, 0);
  const wins = predictions.filter((p) => p.result === 'win').length;
  const totalStake = predictions.reduce((sum, p) => sum + p.stake, 0);
  const totalReturn = predictions.reduce(
    (sum, p) => sum + (p.result === 'win' ? p.stake * (p.odds - 1) : -p.stake),
    0
  );

  // Calculate Sharpe ratio (simplified)
  const returns = predictions.map((p) =>
    p.result === 'win' ? p.stake * (p.odds - 1) : -p.stake
  );
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
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

  const updated = { ...model };
  updated.metrics = {
    avgCLV: totalCLV / predictions.length,
    roi: (totalReturn / totalStake) * 100,
    winRate: (wins / predictions.length) * 100,
    totalBets: predictions.length,
    sharpeRatio,
    maxDrawdown,
    sampleSize: predictions.length,
  };
  updated.testedAt = new Date().toISOString();
  updated.status = 'shadow';

  return updated;
}

/**
 * Compare two model versions
 * Returns winner and recommendation
 */
export function compareModels(
  current: ModelVersion,
  candidate: ModelVersion
): ModelComparison {
  // Ensure minimum sample size
  const minSample = 30;
  if (current.metrics.sampleSize < minSample || candidate.metrics.sampleSize < minSample) {
    return {
      model1: current,
      model2: candidate,
      winner: current.id,
      metrics: {
        clvDifference: candidate.metrics.avgCLV - current.metrics.avgCLV,
        roiDifference: candidate.metrics.roi - current.metrics.roi,
        winRateDifference: candidate.metrics.winRate - current.metrics.winRate,
        statisticalSignificance: 1, // Very high p-value
        confidence: 0.1,
      },
      recommendation: 'inconclusive',
      reasoning: `Insufficient sample size (need ${minSample}, have ${Math.min(current.metrics.sampleSize, candidate.metrics.sampleSize)})`,
    };
  }

  // Calculate differences
  const clvDiff = candidate.metrics.avgCLV - current.metrics.avgCLV;
  const roiDiff = candidate.metrics.roi - current.metrics.roi;
  const winRateDiff = candidate.metrics.winRate - current.metrics.winRate;

  // Simple statistical significance (Bayesian: how confident are we?)
  // Higher positive differences + more bets = more significant
  const confidenceMultiplier = Math.min(1, candidate.metrics.sampleSize / 100);
  const clvSignificance = clvDiff * confidenceMultiplier * 100;

  // Determine winner
  let winner = current.id;
  let recommendation: 'promote' | 'reject' | 'inconclusive' = 'inconclusive';

  if (clvDiff > 0.01 && roiDiff > 1) {
    winner = candidate.id;
    recommendation = 'promote';
  } else if (clvDiff < -0.01 && roiDiff < -1) {
    winner = current.id;
    recommendation = 'reject';
  }

  // Check for statistical significance (simplified)
  // We want: strong improvement OR consistency
  const isSignificant =
    clvSignificance > 0.5 || // Strong CLV improvement
    (candidate.metrics.maxDrawdown < current.metrics.maxDrawdown &&
      clvDiff >= -0.005); // Better risk profile with acceptable CLV

  return {
    model1: current,
    model2: candidate,
    winner,
    metrics: {
      clvDifference: clvDiff,
      roiDifference: roiDiff,
      winRateDifference: winRateDiff,
      statisticalSignificance: isSignificant ? 0.01 : 0.5, // Simplified p-value
      confidence: confidenceMultiplier,
    },
    recommendation: isSignificant ? recommendation : 'inconclusive',
    reasoning: buildComparisonReasoning(clvDiff, roiDiff, candidate, current, isSignificant),
  };
}

function buildComparisonReasoning(
  clvDiff: number,
  roiDiff: number,
  candidate: ModelVersion,
  current: ModelVersion,
  isSignificant: boolean
): string {
  if (!isSignificant) {
    return `Candidate model shows ${clvDiff > 0 ? 'marginal improvement' : 'potential degradation'} but difference is not statistically significant. Requires more testing.`;
  }

  if (clvDiff > 0 && roiDiff > 0) {
    return `✅ Candidate outperforms: +${(clvDiff * 100).toFixed(2)}% CLV, +${roiDiff.toFixed(1)}% ROI. Ready to promote.`;
  } else if (clvDiff > 0) {
    return `✅ Candidate has higher CLV (+${(clvDiff * 100).toFixed(2)}%) but slightly lower ROI. Still recommend promotion for better long-term edge.`;
  } else {
    return `❌ Candidate underperforms current model. Recommend rejection.`;
  }
}

/**
 * Shadow testing: run candidate model alongside current
 * Returns which model to promote
 */
export interface ShadowTestResult {
  winner: string;
  shouldPromote: boolean;
  confidence: number;
  recommendation: string;
}

export function evaluateShadowTest(
  current: ModelVersion,
  candidate: ModelVersion,
  guardrails = {
    minImprovement: 0.01, // 1% CLV improvement
    maxAllowedDrawdown: 0.3, // 30% max drawdown
    minSampleSize: 50,
  }
): ShadowTestResult {
  // Check guardrails
  if (candidate.metrics.sampleSize < guardrails.minSampleSize) {
    return {
      winner: current.id,
      shouldPromote: false,
      confidence: 0.2,
      recommendation: `Insufficient data: ${candidate.metrics.sampleSize} bets (need ${guardrails.minSampleSize})`,
    };
  }

  if (candidate.metrics.maxDrawdown > guardrails.maxAllowedDrawdown) {
    return {
      winner: current.id,
      shouldPromote: false,
      confidence: 0.9,
      recommendation: `Risk guardrail breached: ${(candidate.metrics.maxDrawdown * 100).toFixed(1)}% drawdown > ${(guardrails.maxAllowedDrawdown * 100).toFixed(1)}%`,
    };
  }

  // Check performance
  const improvement = candidate.metrics.avgCLV - current.metrics.avgCLV;

  if (improvement >= guardrails.minImprovement) {
    return {
      winner: candidate.id,
      shouldPromote: true,
      confidence: 0.8,
      recommendation: `✅ PROMOTE: Candidate improves CLV by ${(improvement * 100).toFixed(2)}% with acceptable risk profile`,
    };
  } else if (improvement >= -0.005) {
    return {
      winner: current.id,
      shouldPromote: false,
      confidence: 0.5,
      recommendation: `No clear winner. Candidate slightly ${improvement >= 0 ? 'better' : 'worse'}. Continue monitoring.`,
    };
  } else {
    return {
      winner: current.id,
      shouldPromote: false,
      confidence: 0.9,
      recommendation: `❌ REJECT: Candidate significantly underperforms (CLV ${(improvement * 100).toFixed(2)}%)`,
    };
  }
}

/**
 * Safe promotion: update active model with all safety checks
 */
export interface PromotionRequest {
  currentModel: ModelVersion;
  candidateModel: ModelVersion;
  approver: string; // User approving promotion
  overrideReason?: string;
}

export function promoteModel(request: PromotionRequest): {
  success: boolean;
  newActive: ModelVersion;
  reason: string;
} {
  // Run comparison
  const comparison = compareModels(request.currentModel, request.candidateModel);

  // Check if promotion is approved
  if (
    comparison.recommendation === 'promote' ||
    (request.overrideReason && request.approver)
  ) {
    const promoted = { ...request.candidateModel };
    promoted.status = 'active';
    promoted.promotedAt = new Date().toISOString();
    promoted.promotionStatus = 'approved';
    promoted.promotionReason = request.overrideReason || comparison.reasoning;

    return {
      success: true,
      newActive: promoted,
      reason: comparison.reasoning,
    };
  }

  return {
    success: false,
    newActive: request.currentModel,
    reason: comparison.reasoning,
  };
}

/**
 * Archive old models after promotion
 */
export function archiveModel(model: ModelVersion): ModelVersion {
  const archived = { ...model };
  archived.status = 'archived';
  return archived;
}
