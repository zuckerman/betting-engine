/**
 * Segment Performance Tracking & Weighting
 * Tracks ROI, CLV, edge by segment (league, odds range, market)
 */

export interface Segment {
  id: string;
  name: string;
  bets: number;
  wins: number;
  roi: number;
  clv: number;
  edge: number;
  drawdown: number;
}

export interface SegmentWeight {
  segment: string;
  weight: number; // 0.8 = reduce, 1.2 = boost
  reason: string;
}

/**
 * Calculate weight for a segment based on performance
 * Weight > 1 = boost allocation
 * Weight < 1 = reduce allocation
 */
export function getSegmentWeight(segment: Segment): SegmentWeight {
  // Need sufficient sample
  if (segment.bets < 10) {
    return {
      segment: segment.id,
      weight: 1.0,
      reason: "Insufficient sample",
    };
  }

  let weight = 1.0;
  let reason = "Baseline";

  // Strong performance: boost
  if (segment.roi > 0.1 && segment.clv > 0.01) {
    weight = 1.3;
    reason = "Strong: High ROI + CLV";
  } else if (segment.roi > 0.05 && segment.clv > 0.005) {
    weight = 1.2;
    reason = "Positive: Good ROI + CLV";
  }

  // Weak performance: reduce
  else if (segment.roi < -0.05) {
    weight = 0.5;
    reason = "Weak: Negative ROI";
  } else if (segment.roi < -0.02) {
    weight = 0.7;
    reason = "Underperforming: Negative ROI";
  }

  // Risk check: high drawdown → reduce
  if (segment.drawdown > 0.2) {
    weight *= 0.8;
    reason = `${reason} (High drawdown: ${(segment.drawdown * 100).toFixed(0)}%)`;
  }

  // Cap weight
  weight = Math.max(0.3, Math.min(1.5, weight));

  return {
    segment: segment.id,
    weight,
    reason,
  };
}

/**
 * Calculate weights for multiple segments
 */
export function getSegmentWeights(segments: Segment[]): SegmentWeight[] {
  return segments.map(getSegmentWeight);
}

/**
 * Get aggregate weight (for bets that span multiple segments)
 */
export function getAggregateWeight(weights: SegmentWeight[]): number {
  if (weights.length === 0) return 1.0;

  const sum = weights.reduce((acc, w) => acc + w.weight, 0);
  return sum / weights.length;
}
