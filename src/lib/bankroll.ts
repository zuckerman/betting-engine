/**
 * Bankroll Tracking System
 * 
 * Monitors capital allocation, portfolio value, and drawdown
 * Connects Kelly sizing to actual portfolio performance
 */

export interface BankrollSnapshot {
  date: string;
  totalBankroll: number;
  availableCapital: number; // Not committed to open bets
  exposedCapital: number; // Committed to open bets
  runningPnL: number;
  runningROI: number; // (PnL / Initial) * 100
  totalBetsPlaced: number;
  totalBetsWon: number;
  winRate: number;
  averageOdds: number;
  drawdownPercent: number;
  peakBankroll: number;
}

export interface BankrollTransaction {
  date: string;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'rake';
  amount: number;
  description?: string;
  betId?: string;
}

export class BankrollTracker {
  private initialBankroll: number;
  private snapshots: BankrollSnapshot[] = [];
  private transactions: BankrollTransaction[] = [];
  private peakBankroll: number;
  private currentBankroll: number;

  constructor(initialBankroll: number) {
    this.initialBankroll = initialBankroll;
    this.peakBankroll = initialBankroll;
    this.currentBankroll = initialBankroll;
  }

  /**
   * Record a deposit or withdrawal
   */
  recordTransaction(transaction: BankrollTransaction): void {
    this.transactions.push(transaction);

    if (transaction.type === 'deposit') {
      this.currentBankroll += transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      this.currentBankroll -= transaction.amount;
    } else if (transaction.type === 'win') {
      this.currentBankroll += transaction.amount;
      if (this.currentBankroll > this.peakBankroll) {
        this.peakBankroll = this.currentBankroll;
      }
    } else if (transaction.type === 'loss') {
      this.currentBankroll -= transaction.amount;
    } else if (transaction.type === 'rake') {
      this.currentBankroll -= transaction.amount;
    }
  }

  /**
   * Get total capital allocated (not available for new bets)
   */
  getExposedCapital(openBets: Array<{ stake: number }>): number {
    return openBets.reduce((sum, bet) => sum + bet.stake, 0);
  }

  /**
   * Calculate current drawdown from peak
   */
  getDrawdownPercent(): number {
    if (this.peakBankroll === 0) return 0;
    const drawdown = this.peakBankroll - this.currentBankroll;
    return (drawdown / this.peakBankroll) * 100;
  }

  /**
   * Calculate running ROI
   */
  getROI(): number {
    if (this.initialBankroll === 0) return 0;
    return ((this.currentBankroll - this.initialBankroll) / this.initialBankroll) * 100;
  }

  /**
   * Calculate cumulative profit/loss
   */
  getPnL(): number {
    return this.currentBankroll - this.initialBankroll;
  }

  /**
   * Create snapshot of current state
   */
  createSnapshot(
    stats: {
      totalBetsPlaced: number;
      totalBetsWon: number;
      exposedCapital: number;
      averageOdds: number;
    },
    note?: string
  ): BankrollSnapshot {
    const snapshot: BankrollSnapshot = {
      date: new Date().toISOString(),
      totalBankroll: this.currentBankroll,
      availableCapital: this.currentBankroll - stats.exposedCapital,
      exposedCapital: stats.exposedCapital,
      runningPnL: this.getPnL(),
      runningROI: this.getROI(),
      totalBetsPlaced: stats.totalBetsPlaced,
      totalBetsWon: stats.totalBetsWon,
      winRate: stats.totalBetsPlaced > 0 
        ? (stats.totalBetsWon / stats.totalBetsPlaced) * 100 
        : 0,
      averageOdds: stats.averageOdds,
      drawdownPercent: this.getDrawdownPercent(),
      peakBankroll: this.peakBankroll,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Check if bankroll has hit stop-loss threshold
   */
  checkStopLoss(lossThresholdPercent: number): boolean {
    return this.getDrawdownPercent() >= lossThresholdPercent;
  }

  /**
   * Check if bankroll has hit profit target
   */
  checkProfitTarget(targetROI: number): boolean {
    return this.getROI() >= targetROI;
  }

  /**
   * Get bankroll trajectory (useful for charting)
   */
  getTrajectory(): Array<{
    date: string;
    bankroll: number;
    roi: number;
    drawdown: number;
  }> {
    return this.snapshots.map((snap) => ({
      date: snap.date,
      bankroll: snap.totalBankroll,
      roi: snap.runningROI,
      drawdown: snap.drawdownPercent,
    }));
  }

  /**
   * Get current state
   */
  getCurrentState(): {
    bankroll: number;
    pnl: number;
    roi: number;
    drawdown: number;
  } {
    return {
      bankroll: this.currentBankroll,
      pnl: this.getPnL(),
      roi: this.getROI(),
      drawdown: this.getDrawdownPercent(),
    };
  }

  /**
   * Calculate bet sizing constraints based on Kelly
   * Returns min/max bet size to stay within risk parameters
   */
  getKellyConstraints(
    riskPercentPerBet: number = 2 // Risk 2% of bankroll per bet
  ): {
    minBet: number;
    maxBet: number;
    maxConcurrentBets: number;
  } {
    const maxRiskPerBet = this.currentBankroll * (riskPercentPerBet / 100);
    
    return {
      minBet: Math.max(1, Math.floor(this.currentBankroll * 0.001)), // Min 0.1% of bankroll
      maxBet: maxRiskPerBet * 10, // Assume 10:1 odds for max bet calculation
      maxConcurrentBets: Math.floor(this.currentBankroll / maxRiskPerBet),
    };
  }

  /**
   * Simulate future outcomes based on historical performance
   */
  simulateFuturePerformance(
    historicalWinRate: number,
    averageOdds: number,
    numberOfBets: number = 100
  ): {
    expectedEndBankroll: number;
    confidence95Percent: {
      min: number;
      max: number;
    };
  } {
    const expectedROI = historicalWinRate * (averageOdds - 1) - (1 - historicalWinRate);
    const expectedGrowthPerBet = this.currentBankroll * expectedROI;
    const expectedEndBankroll = this.currentBankroll + expectedGrowthPerBet * numberOfBets;

    // Simple confidence interval (95%)
    const variance = historicalWinRate * (1 - historicalWinRate);
    const stdDev = Math.sqrt(variance * numberOfBets) * this.currentBankroll * (averageOdds - 1);

    return {
      expectedEndBankroll: Math.round(expectedEndBankroll * 100) / 100,
      confidence95Percent: {
        min: Math.round((expectedEndBankroll - 1.96 * stdDev) * 100) / 100,
        max: Math.round((expectedEndBankroll + 1.96 * stdDev) * 100) / 100,
      },
    };
  }
}

/**
 * Helper: Calculate optimal bankroll size given variance
 * Higher variance (more volatile results) requires larger bankroll
 */
export function calculateRequiredBankroll(
  expectedWinRate: number,
  averageOdds: number,
  targetSurvivalRate: number = 0.99, // 99% confidence of not going broke
  maxDrawdownTolerance: number = 0.25 // Accept 25% drawdown
): number {
  // Simplified: need enough to cover worst case drawdown
  // Kelly says fractional bet sizing, so if we're betting 5% per bet max,
  // we need enough for ~20 losing streaks
  
  const expectedValue = expectedWinRate * (averageOdds - 1) - (1 - expectedWinRate);
  const variance = expectedWinRate * (1 - expectedWinRate) * Math.pow(averageOdds - 1, 2);
  
  if (expectedValue <= 0) {
    return Infinity; // No positive EV, infinite bankroll needed
  }

  // Rough estimate: need 30-50x the average bet stake
  const requiredMultiplier = Math.log(1 - targetSurvivalRate) / Math.log(1 - 0.05); // Kelly fraction of 5%
  const requiredBankroll = requiredMultiplier * Math.sqrt(variance) / expectedValue;

  return Math.ceil(requiredBankroll);
}
