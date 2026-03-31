/**
 * Live Execution Engine
 * Executes bets from live signals
 */

import { PredictionBet } from "../engine/types";
import { LiveSignal } from "./signalEngine";
import { evaluateAdaptiveBet, AdaptiveDecision } from "../engine/adaptiveExecution";
import { AdaptiveContext } from "../engine/adaptiveFilter";

export interface ExecutionEvent {
  signal: LiveSignal;
  decision: AdaptiveDecision;
  executedAt: number;
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED";
  error?: string;
}

export class LiveExecutor {
  private executions: ExecutionEvent[] = [];
  private isPaused: boolean = false;

  /**
   * Execute a signal
   */
  async execute(
    signal: LiveSignal,
    bet: PredictionBet,
    bankroll: number,
    context: AdaptiveContext
  ): Promise<ExecutionEvent> {
    const now = Date.now();

    // Create adaptive decision
    const decision = evaluateAdaptiveBet(bet, bankroll, context);

    const event: ExecutionEvent = {
      signal,
      decision,
      executedAt: now,
      status: "PENDING",
    };

    // Execute (placeholder - would integrate with betting API)
    if (decision.action === "BET" && !this.isPaused) {
      // TODO: Call betting API
      // const result = await placeBet({...});
      // event.status = result.success ? "CONFIRMED" : "FAILED";
      // event.error = result.error;

      event.status = "CONFIRMED"; // Simulated
    } else if (this.isPaused) {
      event.status = "CANCELLED";
      event.error = "Executor paused";
    } else {
      event.status = "CONFIRMED"; // Rejected by filter
    }

    this.executions.push(event);
    return event;
  }

  /**
   * Execute multiple signals
   */
  async executeMultiple(
    signals: LiveSignal[],
    bets: Map<string, PredictionBet>,
    bankroll: number,
    context: AdaptiveContext
  ): Promise<ExecutionEvent[]> {
    const events: ExecutionEvent[] = [];

    for (const signal of signals) {
      const bet = bets.get(signal.fixture_id);
      if (!bet) continue;

      const event = await this.execute(signal, bet, bankroll, context);
      events.push(event);
    }

    return events;
  }

  /**
   * Pause execution (emergency stop)
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume execution
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Get execution history
   */
  getHistory(limit?: number): ExecutionEvent[] {
    if (limit) {
      return this.executions.slice(-limit);
    }
    return this.executions;
  }

  /**
   * Get execution stats
   */
  getStats(): {
    totalExecutions: number;
    confirmed: number;
    failed: number;
    cancelled: number;
    totalStaked: number;
  } {
    const stats = {
      totalExecutions: this.executions.length,
      confirmed: 0,
      failed: 0,
      cancelled: 0,
      totalStaked: 0,
    };

    for (const exec of this.executions) {
      if (exec.status === "CONFIRMED") {
        stats.confirmed++;
        if (exec.decision.action === "BET") {
          stats.totalStaked += exec.decision.stake;
        }
      } else if (exec.status === "FAILED") {
        stats.failed++;
      } else if (exec.status === "CANCELLED") {
        stats.cancelled++;
      }
    }

    return stats;
  }

  /**
   * Clear execution history
   */
  clear() {
    this.executions = [];
  }
}

// Singleton instance
export const liveExecutor = new LiveExecutor();
