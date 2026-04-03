/**
 * Market Regime Detection
 *
 * Detects if market is "easy" (edge exists) or "hard" (efficient)
 * Adapts betting strategy based on regime
 *
 * States:
 * - FAVOURABLE: CLV > +0.05 (easy money)
 * - NEUTRAL: -0.02 < CLV < +0.02 (normal)
 * - UNFAVOURABLE: CLV < -0.02 (market moved against us)
 */

export type MarketRegime = 'FAVOURABLE' | 'NEUTRAL' | 'UNFAVOURABLE';

export interface RegimeConfig {
  favourable: {
    betSizeMultiplier: number; // Increase stakes
    edgeThreshold: number; // Lower threshold to accept bets
  };
  neutral: {
    betSizeMultiplier: number; // Normal stakes
    edgeThreshold: number;
  };
  unfavourable: {
    betSizeMultiplier: number; // Reduce stakes
    edgeThreshold: number; // Higher threshold, be more selective
  };
}

export const DEFAULT_REGIME_CONFIG: RegimeConfig = {
  favourable: {
    betSizeMultiplier: 1.2, // 20% larger bets
    edgeThreshold: 1, // Lower threshold (1% edge)
  },
  neutral: {
    betSizeMultiplier: 1.0, // Normal
    edgeThreshold: 2, // 2% edge required
  },
  unfavourable: {
    betSizeMultiplier: 0.7, // 30% smaller bets
    edgeThreshold: 5, // High threshold (5% edge required)
  },
};

export interface RegimeData {
  regime: MarketRegime;
  avgClvRecent: number; // Last 50 bets
  avgClvAllTime: number;
  trend: 'improving' | 'stable' | 'declining';
  totalBets: number;
  daysSinceChange: number;
  confidence: number; // 0-1: how confident we are in this regime
}

/**
 * Determine market regime from recent CLV data
 */
export function detectRegime(
  recentBets: Array<{ clv: number }>,
  allBets: Array<{ clv: number }>
): RegimeData {
  if (recentBets.length === 0) {
    return {
      regime: 'NEUTRAL',
      avgClvRecent: 0,
      avgClvAllTime: 0,
      trend: 'stable',
      totalBets: 0,
      daysSinceChange: 0,
      confidence: 0,
    };
  }

  const avgClvRecent =
    recentBets.reduce((sum, b) => sum + b.clv, 0) / recentBets.length;

  const avgClvAllTime =
    allBets.length > 0 ? allBets.reduce((sum, b) => sum + b.clv, 0) / allBets.length : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (avgClvRecent > avgClvAllTime + 0.02) {
    trend = 'improving';
  } else if (avgClvRecent < avgClvAllTime - 0.02) {
    trend = 'declining';
  }

  // Determine regime
  let regime: MarketRegime;
  if (avgClvRecent > 0.05) {
    regime = 'FAVOURABLE';
  } else if (avgClvRecent < -0.02) {
    regime = 'UNFAVOURABLE';
  } else {
    regime = 'NEUTRAL';
  }

  // Confidence: how many recent bets do we have?
  // More bets = more confident
  const confidence = Math.min(1, recentBets.length / 50);

  return {
    regime,
    avgClvRecent,
    avgClvAllTime,
    trend,
    totalBets: allBets.length,
    daysSinceChange: 0, // Would need timestamp tracking
    confidence,
  };
}

/**
 * Get betting adjustments for current regime
 */
export function getRegimeAdjustments(
  regime: MarketRegime,
  config: RegimeConfig = DEFAULT_REGIME_CONFIG
): {
  betSizeMultiplier: number;
  edgeThreshold: number;
  recommendation: string;
} {
  const adjustments = config[regime.toLowerCase() as keyof RegimeConfig] || config.neutral;

  return {
    betSizeMultiplier: adjustments.betSizeMultiplier,
    edgeThreshold: adjustments.edgeThreshold,
    recommendation:
      regime === 'FAVOURABLE'
        ? 'Market is favourable - increase bet sizes'
        : regime === 'UNFAVOURABLE'
          ? 'Market is unfavourable - reduce bets or skip'
          : 'Market is neutral - standard approach',
  };
}

/**
 * Apply regime adjustments to bet stake
 */
export function adjustStakeForRegime(
  baseStake: number,
  regime: MarketRegime,
  config: RegimeConfig = DEFAULT_REGIME_CONFIG
): number {
  const adjustments = getRegimeAdjustments(regime, config);
  return baseStake * adjustments.betSizeMultiplier;
}

/**
 * Filter bets based on regime edge threshold
 */
export function filterByRegimeThreshold(
  bets: Array<{ edge: number }>,
  regime: MarketRegime,
  config: RegimeConfig = DEFAULT_REGIME_CONFIG
): Array<{ edge: number }> {
  const adjustments = getRegimeAdjustments(regime, config);
  const threshold = adjustments.edgeThreshold / 100; // Convert to decimal

  return bets.filter((b) => b.edge >= threshold);
}

/**
 * Regime change detection
 * Identifies when market transitions between regimes
 */
export interface RegimeChange {
  from: MarketRegime;
  to: MarketRegime;
  date: string;
  clvChange: number;
  impact: 'major' | 'minor';
}

export function detectRegimeChange(
  previous: RegimeData,
  current: RegimeData
): RegimeChange | null {
  if (previous.regime === current.regime) {
    return null; // No change
  }

  const clvChange = current.avgClvRecent - previous.avgClvRecent;
  const impact = Math.abs(clvChange) > 0.05 ? 'major' : 'minor';

  return {
    from: previous.regime,
    to: current.regime,
    date: new Date().toISOString(),
    clvChange,
    impact,
  };
}

/**
 * Get regime-specific strategy
 */
export function getRegimeStrategy(
  regime: MarketRegime,
  clvData: RegimeData
): {
  mode: string;
  betSize: string;
  selectivity: string;
  riskLevel: string;
  actions: string[];
} {
  switch (regime) {
    case 'FAVOURABLE':
      return {
        mode: 'Aggressive',
        betSize: 'Increase to 1.2x normal',
        selectivity: 'Lower edge threshold to 1%',
        riskLevel: 'Higher (CLV strongly positive)',
        actions: [
          'Increase Kelly fraction from 0.5 to 0.75',
          'Extend search to weaker markets',
          'Add more concurrent bets',
          'Consider larger maximum bet size',
        ],
      };

    case 'UNFAVOURABLE':
      return {
        mode: 'Defensive',
        betSize: 'Reduce to 0.7x normal',
        selectivity: 'Raise edge threshold to 5%',
        riskLevel: 'Lower (protect capital)',
        actions: [
          'Reduce Kelly fraction from 0.5 to 0.25',
          'Focus only on strongest signals',
          'Reduce concurrent bets',
          'Consider temporary break if CLV stays negative',
        ],
      };

    case 'NEUTRAL':
    default:
      return {
        mode: 'Standard',
        betSize: 'Normal 1.0x',
        selectivity: 'Standard edge threshold 2%',
        riskLevel: 'Balanced',
        actions: [
          'Maintain normal Kelly fraction (0.5)',
          'Standard signal selection',
          'Normal concurrent bet limit',
          'Monitor for regime change signals',
        ],
      };
  }
}

/**
 * Regime stability tracker
 * How long has market been in current regime?
 */
export class RegimeTracker {
  private history: RegimeData[] = [];
  private regimeStartDate: string = new Date().toISOString();

  addMeasurement(data: RegimeData): void {
    this.history.push(data);

    // If regime changed, reset start date
    if (this.history.length > 1) {
      const prev = this.history[this.history.length - 2];
      if (prev.regime !== data.regime) {
        this.regimeStartDate = new Date().toISOString();
      }
    }
  }

  getCurrentRegime(): RegimeData | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getRegimeDuration(): number {
    // Days in current regime
    return (Date.now() - new Date(this.regimeStartDate).getTime()) / (1000 * 60 * 60 * 24);
  }

  getRegimeHistory(): RegimeData[] {
    return this.history;
  }

  getStability(): number {
    // How stable is current regime? (0-1)
    if (this.history.length < 5) return 0.5;

    const recentRegimes = this.history.slice(-10);
    const currentRegime = recentRegimes[recentRegimes.length - 1].regime;
    const sameCount = recentRegimes.filter((r) => r.regime === currentRegime).length;

    return sameCount / recentRegimes.length;
  }
}
