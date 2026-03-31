/**
 * Live Odds Polling Service
 * Continuously monitors odds and detects value opportunities
 */

interface LiveOdds {
  fixture_id: string;
  market: string; // e.g., "home_win", "away_win", "draw"
  odds: number;
  timestamp: number;
  change: number; // odds change from last poll
  volatility: number; // recent odds movement range
}

interface OddsSnapshot {
  fixture_id: string;
  markets: Map<string, LiveOdds>;
  lastUpdate: number;
}

export class OddsPoller {
  private snapshots: Map<string, OddsSnapshot> = new Map();
  private history: Map<string, LiveOdds[]> = new Map(); // Keep last 50 updates
  private isRunning: boolean = false;

  /**
   * Record live odds update
   */
  recordOdds(
    fixture_id: string,
    market: string,
    odds: number
  ): {
    odds: LiveOdds;
    snapshot: OddsSnapshot;
  } {
    const key = `${fixture_id}:${market}`;
    const now = Date.now();

    // Get previous odds
    const prevOdds = this.snapshots.get(fixture_id)?.markets.get(market);
    const change = prevOdds ? odds - prevOdds.odds : 0;

    // Calculate volatility (range in last 50 samples)
    const history = this.history.get(key) || [];
    const volatility =
      history.length > 0
        ? Math.max(...history.map((o) => o.odds)) -
          Math.min(...history.map((o) => o.odds))
        : 0;

    const liveOdds: LiveOdds = {
      fixture_id,
      market,
      odds,
      timestamp: now,
      change,
      volatility,
    };

    // Update history
    const newHistory = [...history, liveOdds].slice(-50);
    this.history.set(key, newHistory);

    // Update snapshot
    const snapshot =
      this.snapshots.get(fixture_id) || {
        fixture_id,
        markets: new Map(),
        lastUpdate: now,
      };
    snapshot.markets.set(market, liveOdds);
    snapshot.lastUpdate = now;
    this.snapshots.set(fixture_id, snapshot);

    return { odds: liveOdds, snapshot };
  }

  /**
   * Get current odds for a fixture/market
   */
  getCurrentOdds(fixture_id: string, market: string): LiveOdds | null {
    return this.snapshots.get(fixture_id)?.markets.get(market) || null;
  }

  /**
   * Get all odds for a fixture
   */
  getFixtureOdds(fixture_id: string): LiveOdds[] {
    const snapshot = this.snapshots.get(fixture_id);
    return snapshot ? Array.from(snapshot.markets.values()) : [];
  }

  /**
   * Detect odd movements (sharp money)
   * Returns markets with significant recent moves
   */
  detectSharpMoney(threshold: number = 0.02): LiveOdds[] {
    const sharpMoves: LiveOdds[] = [];

    for (const snapshot of this.snapshots.values()) {
      for (const odds of snapshot.markets.values()) {
        if (Math.abs(odds.change) > threshold) {
          sharpMoves.push(odds);
        }
      }
    }

    return sharpMoves;
  }

  /**
   * Detect volatile markets (high trading activity)
   */
  detectVolatility(threshold: number = 0.05): LiveOdds[] {
    const volatileMarkets: LiveOdds[] = [];

    for (const snapshot of this.snapshots.values()) {
      for (const odds of snapshot.markets.values()) {
        if (odds.volatility > threshold) {
          volatileMarkets.push(odds);
        }
      }
    }

    return volatileMarkets;
  }

  /**
   * Clear old data (keep last 1 hour)
   */
  prune(olderThanMs: number = 3600000) {
    const cutoff = Date.now() - olderThanMs;

    for (const [key, history] of this.history.entries()) {
      const filtered = history.filter((o) => o.timestamp > cutoff);
      if (filtered.length === 0) {
        this.history.delete(key);
      } else {
        this.history.set(key, filtered);
      }
    }
  }

  /**
   * Get polling status
   */
  getStatus(): {
    isRunning: boolean;
    fixtures: number;
    markets: number;
    lastUpdate: number;
  } {
    let totalMarkets = 0;
    let lastUpdate = 0;

    for (const snapshot of this.snapshots.values()) {
      totalMarkets += snapshot.markets.size;
      lastUpdate = Math.max(lastUpdate, snapshot.lastUpdate);
    }

    return {
      isRunning: this.isRunning,
      fixtures: this.snapshots.size,
      markets: totalMarkets,
      lastUpdate,
    };
  }
}

// Singleton instance
export const oddsPoller = new OddsPoller();
