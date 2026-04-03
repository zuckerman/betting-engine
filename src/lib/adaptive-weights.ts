/**
 * Adaptive Model Weights System
 * 
 * Learns which market segments have edge based on CLV signals
 * Automatically adjusts model weight allocation to profitable segments
 * Implements multi-armed bandit approach for exploration/exploitation
 */

export interface SegmentPerformance {
  segmentId: string; // e.g., "EPL_BTTS", "LaLiga_OverUnder"
  totalBets: number;
  winningBets: number;
  totalCLV: number;
  averageCLV: number;
  roi: number;
  confidence: number; // 0-1: how confident are we in this estimate
  lastUpdated: string;
  weight: number; // 0-1: allocation weight for this segment
}

export interface AdaptiveWeightsConfig {
  minBetsForSignificance: number; // Don't adjust until we have this many bets
  learningRate: number; // 0-1: how quickly to adjust weights
  explorationRate: number; // 0-1: probability of trying low-weight segments
  clvThresholdForPositive: number; // CLV > this = positive signal
  confidenceDecay: number; // How fast confidence decays over time
}

export class AdaptiveWeightsTracker {
  private segments: Map<string, SegmentPerformance> = new Map();
  private config: AdaptiveWeightsConfig;
  private totalBets: number = 0;

  constructor(config: Partial<AdaptiveWeightsConfig> = {}) {
    this.config = {
      minBetsForSignificance: config.minBetsForSignificance ?? 20,
      learningRate: config.learningRate ?? 0.1,
      explorationRate: config.explorationRate ?? 0.15,
      clvThresholdForPositive: config.clvThresholdForPositive ?? 0.03,
      confidenceDecay: config.confidenceDecay ?? 0.98,
    };
  }

  /**
   * Initialize segment with equal weights
   */
  initializeSegments(segmentIds: string[]): void {
    const equalWeight = 1 / segmentIds.length;
    
    segmentIds.forEach((id) => {
      if (!this.segments.has(id)) {
        this.segments.set(id, {
          segmentId: id,
          totalBets: 0,
          winningBets: 0,
          totalCLV: 0,
          averageCLV: 0,
          roi: 0,
          confidence: 0.5, // Start with moderate confidence
          lastUpdated: new Date().toISOString(),
          weight: equalWeight,
        });
      }
    });
  }

  /**
   * Record bet outcome for a segment
   */
  recordBetOutcome(
    segmentId: string,
    odds: number,
    won: boolean,
    clv: number
  ): void {
    let segment = this.segments.get(segmentId);
    
    if (!segment) {
      segment = {
        segmentId,
        totalBets: 0,
        winningBets: 0,
        totalCLV: 0,
        averageCLV: 0,
        roi: 0,
        confidence: 0.3, // Low confidence for new segment
        lastUpdated: new Date().toISOString(),
        weight: 0, // Will be allocated during rebalance
      };
      this.segments.set(segmentId, segment);
    }

    // Update metrics
    segment.totalBets += 1;
    if (won) {
      segment.winningBets += 1;
    }
    segment.totalCLV += clv;
    segment.averageCLV = segment.totalCLV / segment.totalBets;
    segment.roi = segment.winningBets / segment.totalBets;
    segment.lastUpdated = new Date().toISOString();

    this.totalBets += 1;

    // Update confidence as we get more data
    if (segment.totalBets >= this.config.minBetsForSignificance) {
      segment.confidence = Math.min(1, 0.5 + segment.totalBets / (2 * this.config.minBetsForSignificance));
    }
  }

  /**
   * Rebalance weights based on performance
   * Uses Thompson Sampling for exploration/exploitation tradeoff
   */
  rebalanceWeights(): void {
    const segments = Array.from(this.segments.values());
    
    if (segments.length === 0) return;

    // Calculate quality scores for each segment
    const scores = segments.map((seg) => {
      // Quality = (positive CLV) * (confidence) + (random exploration)
      const hasEdge = seg.averageCLV > this.config.clvThresholdForPositive ? 1 : 0;
      const qualityScore =
        hasEdge * seg.confidence +
        Math.random() * this.config.explorationRate;

      return {
        segmentId: seg.segmentId,
        score: qualityScore,
        segment: seg,
      };
    });

    // Sort by score (descending)
    scores.sort((a, b) => b.score - a.score);

    // Allocate weights proportionally to scores
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    
    scores.forEach(({ segment, score }) => {
      const newWeight = totalScore > 0 ? score / totalScore : 1 / segments.length;
      
      // Apply learning rate smoothing (don't jump too fast)
      segment.weight =
        segment.weight * (1 - this.config.learningRate) +
        newWeight * this.config.learningRate;
    });

    // Decay confidence over time (old data becomes less reliable)
    segments.forEach((seg) => {
      const daysSinceUpdate = (Date.now() - new Date(seg.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      seg.confidence = seg.confidence * Math.pow(this.config.confidenceDecay, daysSinceUpdate);
    });
  }

  /**
   * Get recommended segment for next bet (multi-armed bandit)
   */
  getNextSegmentForBet(): string | null {
    const segments = Array.from(this.segments.values());
    
    if (segments.length === 0) return null;

    // Use roulette wheel selection based on weights
    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
    let random = Math.random() * totalWeight;

    for (const segment of segments) {
      random -= segment.weight;
      if (random <= 0) {
        return segment.segmentId;
      }
    }

    return segments[segments.length - 1].segmentId;
  }

  /**
   * Get current weights for all segments
   */
  getWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    
    this.segments.forEach((seg) => {
      weights[seg.segmentId] = seg.weight;
    });

    return weights;
  }

  /**
   * Get performance stats for all segments
   */
  getPerformanceStats(): SegmentPerformance[] {
    return Array.from(this.segments.values()).sort((a, b) => b.weight - a.weight);
  }

  /**
   * Identify weak segments that should be de-emphasized
   */
  getWeakSegments(minWeightThreshold: number = 0.01): SegmentPerformance[] {
    return Array.from(this.segments.values()).filter(
      (seg) =>
        seg.averageCLV < this.config.clvThresholdForPositive &&
        seg.weight > minWeightThreshold &&
        seg.totalBets >= this.config.minBetsForSignificance
    );
  }

  /**
   * Identify strong segments to maximize allocation
   */
  getStrongSegments(minClvThreshold: number = 0.05): SegmentPerformance[] {
    return Array.from(this.segments.values()).filter(
      (seg) =>
        seg.averageCLV > minClvThreshold &&
        seg.totalBets >= this.config.minBetsForSignificance
    );
  }

  /**
   * Get segments with insufficient data
   */
  getUncertainSegments(): SegmentPerformance[] {
    return Array.from(this.segments.values()).filter(
      (seg) => seg.totalBets < this.config.minBetsForSignificance
    );
  }

  /**
   * Calculate expected value of current allocation
   */
  getExpectedPortfolioEV(): number {
    const segments = Array.from(this.segments.values());
    
    return segments.reduce((ev, seg) => {
      const segmentEV = seg.weight * seg.averageCLV;
      return ev + segmentEV;
    }, 0);
  }

  /**
   * Get allocation recommendation for next N bets
   */
  getNextNBetsAllocation(numberOfBets: number): Array<{
    segmentId: string;
    recommendedBets: number;
    reasoning: string;
  }> {
    const allocation: Array<{
      segmentId: string;
      recommendedBets: number;
      reasoning: string;
    }> = [];

    const segments = Array.from(this.segments.values())
      .sort((a, b) => b.weight - a.weight);

    segments.forEach((seg) => {
      const recommendedBets = Math.round(numberOfBets * seg.weight);
      
      let reasoning = '';
      if (seg.averageCLV > this.config.clvThresholdForPositive) {
        reasoning = `Strong edge (CLV: ${seg.averageCLV.toFixed(3)})`;
      } else if (seg.totalBets < this.config.minBetsForSignificance) {
        reasoning = `Exploration (${seg.totalBets} bets, low confidence)`;
      } else {
        reasoning = `Weak edge or testing (CLV: ${seg.averageCLV.toFixed(3)})`;
      }

      allocation.push({
        segmentId: seg.segmentId,
        recommendedBets,
        reasoning,
      });
    });

    return allocation;
  }

  /**
   * Reset segment performance (when model is updated)
   */
  resetSegment(segmentId: string): void {
    const segment = this.segments.get(segmentId);
    if (segment) {
      segment.totalBets = 0;
      segment.winningBets = 0;
      segment.totalCLV = 0;
      segment.averageCLV = 0;
      segment.roi = 0;
      segment.confidence = 0.3;
      segment.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Export weights for persistence (save to DB)
   */
  exportWeights(): Record<string, {
    weight: number;
    confidence: number;
    totalBets: number;
    averageCLV: number;
  }> {
    const exported: Record<string, any> = {};
    
    this.segments.forEach((seg) => {
      exported[seg.segmentId] = {
        weight: seg.weight,
        confidence: seg.confidence,
        totalBets: seg.totalBets,
        averageCLV: seg.averageCLV,
      };
    });

    return exported;
  }

  /**
   * Import weights from persistence
   */
  importWeights(exported: Record<string, any>): void {
    Object.entries(exported).forEach(([segmentId, data]) => {
      const segment = this.segments.get(segmentId);
      if (segment && data) {
        segment.weight = data.weight ?? segment.weight;
        segment.confidence = data.confidence ?? segment.confidence;
      }
    });
  }
}

/**
 * Helper: Create segment IDs from market dimensions
 */
export function createSegmentId(league: string, market: string): string {
  return `${league.toUpperCase()}_${market.toUpperCase()}`;
}

/**
 * Helper: Extract market dimensions from segment ID
 */
export function parseSegmentId(segmentId: string): {
  league: string;
  market: string;
} {
  const [league, market] = segmentId.split('_');
  return { league: league.toLowerCase(), market: market.toLowerCase() };
}
