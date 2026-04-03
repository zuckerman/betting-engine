/**
 * Edge Decay Detection
 *
 * Monitors if your edge is fading over time
 * Triggers exploration mode when decay detected
 * Automatically adapts strategy aggressiveness
 */

export type SystemState = 'strong' | 'stable' | 'declining' | 'decayed';

export interface EdgeHealthMetrics {
  state: SystemState;
  clvRecent: number; // Last 50 bets
  clvHistorical: number; // All-time average
  clvTrend: 'improving' | 'stable' | 'declining';
  decayRate: number; // % per bet
  confidence: number; // 0-1: how sure are we?
  daysToRecovery: number; // Estimated days to recover if trend continues
  explorationMultiplier: number; // How much to increase new strategy testing
}

/**
 * Detect current edge health state
 */
export function detectEdgeHealth(
  recentBets: Array<{ clv: number }>,
  historicalBets: Array<{ clv: number }>,
  thresholds = {
    strongEdge: 0.05, // CLV > 5%
    stableEdge: 0.01, // CLV > 1%
    decayingEdge: -0.01, // CLV < -1%
  }
): EdgeHealthMetrics {
  const recentCLV =
    recentBets.length > 0
      ? recentBets.reduce((sum, b) => sum + b.clv, 0) / recentBets.length
      : 0;

  const historicalCLV =
    historicalBets.length > 0
      ? historicalBets.reduce((sum, b) => sum + b.clv, 0) / historicalBets.length
      : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentCLV > historicalCLV + 0.01) {
    trend = 'improving';
  } else if (recentCLV < historicalCLV - 0.01) {
    trend = 'declining';
  }

  // Determine state
  let state: SystemState = 'stable';
  if (recentCLV > thresholds.strongEdge) {
    state = 'strong';
  } else if (recentCLV < thresholds.decayingEdge) {
    state = 'decayed';
  } else if (trend === 'declining') {
    state = 'declining';
  }

  // Calculate decay rate
  const decayRate =
    recentBets.length > 0
      ? (historicalCLV - recentCLV) / Math.max(1, recentBets.length) * 100
      : 0;

  // Confidence increases with sample size
  const confidence = Math.min(1, recentBets.length / 100);

  // Estimate recovery time if trend continues
  const daysToRecovery =
    decayRate > 0
      ? Math.ceil((recentCLV - historicalCLV) / decayRate / Math.max(1, recentBets.length / 7))
      : 0;

  // Exploration multiplier increases when decay detected
  let explorationMultiplier = 1;
  if (state === 'declining') {
    explorationMultiplier = 1.5; // Try 50% more new strategies
  } else if (state === 'decayed') {
    explorationMultiplier = 3; // Emergency: try 3x new strategies
  }

  return {
    state,
    clvRecent: recentCLV,
    clvHistorical: historicalCLV,
    clvTrend: trend,
    decayRate,
    confidence,
    daysToRecovery: Math.max(0, daysToRecovery),
    explorationMultiplier,
  };
}

/**
 * Get system health status with recommendations
 */
export function getSystemHealth(
  metrics: EdgeHealthMetrics
): {
  status: string;
  emoji: string;
  urgency: 'normal' | 'warning' | 'critical';
  actions: string[];
} {
  switch (metrics.state) {
    case 'strong':
      return {
        status: 'Strong Edge Detected',
        emoji: '💪',
        urgency: 'normal',
        actions: [
          'Increase kelly fraction from 0.25 to 0.35',
          'Expand to weaker market segments',
          'Add more concurrent bets (if risk allows)',
          'Monitor for market adaptation',
        ],
      };

    case 'stable':
      return {
        status: 'Stable System',
        emoji: '✅',
        urgency: 'normal',
        actions: [
          'Maintain current strategy',
          'Run shadow tests on new variants',
          'Monitor consistency',
        ],
      };

    case 'declining':
      return {
        status: '⚠️ Edge Declining',
        emoji: '📉',
        urgency: 'warning',
        actions: [
          'Increase new strategy generation (50% more tests)',
          'Reduce kelly fraction to 0.15',
          'Focus on high-confidence bets only',
          'Accelerate model retraining',
          `Edge declining ~${metrics.decayRate.toFixed(3)}% per bet`,
        ],
      };

    case 'decayed':
      return {
        status: '🚨 Edge Lost',
        emoji: '❌',
        urgency: 'critical',
        actions: [
          'REDUCE bet sizing immediately (kelly 0.1)',
          'INCREASE exploration 3x (try many new strategies)',
          'Consider temporary halt if recovery unclear',
          'Full system retraining needed',
          'CLV is negative - market has adapted',
        ],
      };

    default:
      return {
        status: 'Unknown',
        emoji: '?',
        urgency: 'normal',
        actions: [],
      };
  }
}

/**
 * Calculate historical CLV trend
 * Shows if edge is stable or drifting
 */
export interface CLVTrendPoint {
  period: string; // Day, week
  clv: number;
  sampleSize: number;
}

export function calculateCLVTrend(
  bets: Array<{ clv: number; createdAt: string }>,
  periodDays: number = 7
): CLVTrendPoint[] {
  if (bets.length === 0) return [];

  const now = new Date();
  const trends: CLVTrendPoint[] = [];

  for (let i = 0; i < 4; i++) {
    const startDate = new Date(now.getTime() - (i + 1) * periodDays * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() - i * periodDays * 24 * 60 * 60 * 1000);

    const periodBets = bets.filter((b) => {
      const betDate = new Date(b.createdAt);
      return betDate >= startDate && betDate < endDate;
    });

    if (periodBets.length > 0) {
      const avgCLV = periodBets.reduce((sum, b) => sum + b.clv, 0) / periodBets.length;

      trends.push({
        period: `${i * periodDays}-${(i + 1) * periodDays}d ago`,
        clv: avgCLV,
        sampleSize: periodBets.length,
      });
    }
  }

  return trends.reverse(); // Oldest first
}

/**
 * Detect market regime change
 * When edge characteristics shift fundamentally
 */
export interface RegimeChangeSignal {
  detected: boolean;
  changeType: 'gradual' | 'sudden' | 'none';
  severity: number; // 0-1
  affectedMarkets: string[];
  recommendation: string;
}

export function detectRegimeChange(
  recentBets: Array<{ clv: number; market: string }>,
  historicalBets: Array<{ clv: number; market: string }>
): RegimeChangeSignal {
  if (recentBets.length < 20 || historicalBets.length < 50) {
    return {
      detected: false,
      changeType: 'none',
      severity: 0,
      affectedMarkets: [],
      recommendation: 'Insufficient data',
    };
  }

  // Group by market
  const recentByMarket = groupByMarket(recentBets);
  const historicalByMarket = groupByMarket(historicalBets);

  const affectedMarkets: string[] = [];
  let totalShift = 0;

  for (const market in recentByMarket) {
    const recent = recentByMarket[market];
    const historical = historicalByMarket[market] || 0;

    const shift = Math.abs(recent - historical);
    totalShift += shift;

    if (shift > 0.03) {
      // > 3% CLV shift
      affectedMarkets.push(market);
    }
  }

  const severity = Math.min(1, totalShift);

  let changeType: 'gradual' | 'sudden' | 'none' = 'none';
  if (severity > 0.1) {
    changeType = severity > 0.05 ? 'sudden' : 'gradual';
  }

  return {
    detected: severity > 0.05,
    changeType,
    severity,
    affectedMarkets,
    recommendation:
      affectedMarkets.length > 0
        ? `Edge changed in: ${affectedMarkets.join(', ')}. Consider adjusting strategy for these markets.`
        : 'No significant regime change detected',
  };
}

function groupByMarket(bets: Array<{ clv: number; market: string }>): Record<string, number> {
  const byMarket: Record<string, number[]> = {};

  bets.forEach((b) => {
    if (!byMarket[b.market]) byMarket[b.market] = [];
    byMarket[b.market].push(b.clv);
  });

  const result: Record<string, number> = {};
  for (const market in byMarket) {
    result[market] = byMarket[market].reduce((a, b) => a + b, 0) / byMarket[market].length;
  }

  return result;
}

/**
 * Calculate recovery plan
 * What would need to happen for edge to return?
 */
export function getRecoveryPlan(metrics: EdgeHealthMetrics): {
  steps: string[];
  timeframe: string;
  probability: number;
} {
  if (metrics.state === 'strong' || metrics.state === 'stable') {
    return {
      steps: ['Continue current strategy'],
      timeframe: 'N/A',
      probability: 1,
    };
  }

  if (metrics.state === 'declining') {
    return {
      steps: [
        'Identify which market segments are weakening',
        'Test new parameter combinations in shadow mode',
        'Reduce exposure to weak segments',
        'Focus bets on highest-conviction signals',
        'Retrain calibration model',
      ],
      timeframe: `${metrics.daysToRecovery + 7}-14 days`,
      probability: 0.7,
    };
  }

  // Decayed
  return {
    steps: [
      'PAUSE live trading (reduce to paper/shadow only)',
      'Complete system retraining with fresh data',
      'Generate 10+ new strategy variants',
      'A/B test all variants simultaneously',
      'Only resume live trading if new edge confirmed',
    ],
    timeframe: '14-30 days',
    probability: 0.5,
  };
}
