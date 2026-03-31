/**
 * Live Signal Engine
 * Detects betting opportunities from live odds vs model probabilities
 */

import { PredictionBet } from "../engine/types";
import { oddsPoller } from "./oddsPoller";

export interface LiveSignal {
  fixture_id: string;
  market: string;
  model_probability: number;
  market_odds: number;
  market_probability: number;
  edge: number;
  signal_strength: number; // 0-1, how confident the signal is
  type: "VALUE" | "MISMATCH" | "SHARP_MOVE";
  timestamp: number;
  urgency: "LOW" | "MEDIUM" | "HIGH"; // Based on odds volatility
}

/**
 * Generate signals from live odds
 */
export function generateSignals(
  predictions: PredictionBet[],
  minEdge: number = 0.02,
  sharpnessThreshold: number = 0.02
): LiveSignal[] {
  const signals: LiveSignal[] = [];
  const now = Date.now();

  for (const pred of predictions) {
    const liveOdds = oddsPoller.getCurrentOdds(
      String(pred.fixture_id),
      "home_win" // TODO: map market type
    );

    if (!liveOdds) continue;

    const marketProb = 1 / liveOdds.odds;
    const edge = pred.model_probability - marketProb;

    // Check for value
    if (edge >= minEdge) {
      const signalStrength = Math.min(edge / (minEdge * 2), 1);

      let urgency: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (Math.abs(liveOdds.change) > sharpnessThreshold) {
        urgency = "HIGH"; // Sharp money moving
      } else if (liveOdds.volatility > 0.05) {
        urgency = "MEDIUM"; // Volatile market
      }

      signals.push({
        fixture_id: String(pred.fixture_id),
        market: "home_win",
        model_probability: pred.model_probability,
        market_odds: liveOdds.odds,
        market_probability: marketProb,
        edge,
        signal_strength: signalStrength,
        type: "VALUE",
        timestamp: now,
        urgency,
      });
    } else if (Math.abs(edge) > 0.05) {
      // Significant mismatch (even if negative edge)
      signals.push({
        fixture_id: String(pred.fixture_id),
        market: "home_win",
        model_probability: pred.model_probability,
        market_odds: liveOdds.odds,
        market_probability: marketProb,
        edge,
        signal_strength: Math.abs(edge),
        type: "MISMATCH",
        timestamp: now,
        urgency: "MEDIUM",
      });
    }
  }

  // Check for sharp moves (regardless of predictions)
  const sharpMoves = oddsPoller.detectSharpMoney(sharpnessThreshold);
  for (const move of sharpMoves) {
    signals.push({
      fixture_id: move.fixture_id,
      market: move.market,
      model_probability: 0.5, // Unknown
      market_odds: move.odds,
      market_probability: 1 / move.odds,
      edge: 0, // Unknown
      signal_strength: Math.abs(move.change),
      type: "SHARP_MOVE",
      timestamp: now,
      urgency: "HIGH",
    });
  }

  return signals;
}

/**
 * Filter signals by urgency/strength
 */
export function filterSignals(
  signals: LiveSignal[],
  minStrength: number = 0.5,
  urgency?: "LOW" | "MEDIUM" | "HIGH"
): LiveSignal[] {
  return signals.filter((s) => {
    if (s.signal_strength < minStrength) return false;
    if (urgency && s.urgency !== urgency) return false;
    return true;
  });
}

/**
 * Prioritize signals for execution
 */
export function prioritizeSignals(signals: LiveSignal[]): LiveSignal[] {
  const urgencyScore = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  return [...signals].sort((a, b) => {
    // Sort by: urgency > signal_strength > type (VALUE first)
    const urgencyDiff = urgencyScore[b.urgency] - urgencyScore[a.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    const strengthDiff = b.signal_strength - a.signal_strength;
    if (strengthDiff !== 0) return strengthDiff;

    const typeScore = { VALUE: 3, SHARP_MOVE: 2, MISMATCH: 1 };
    return (typeScore[b.type] || 0) - (typeScore[a.type] || 0);
  });
}

/**
 * Group signals by fixture for batch execution
 */
export function groupByFixture(signals: LiveSignal[]): Map<string, LiveSignal[]> {
  const groups = new Map<string, LiveSignal[]>();

  for (const signal of signals) {
    if (!groups.has(signal.fixture_id)) {
      groups.set(signal.fixture_id, []);
    }
    groups.get(signal.fixture_id)!.push(signal);
  }

  return groups;
}

/**
 * Get signal summary for reporting
 */
export interface SignalSummary {
  totalSignals: number;
  byType: { VALUE: number; SHARP_MOVE: number; MISMATCH: number };
  byUrgency: { HIGH: number; MEDIUM: number; LOW: number };
  avgStrength: number;
  topSignal: LiveSignal | null;
}

export function getSummary(signals: LiveSignal[]): SignalSummary {
  if (signals.length === 0) {
    return {
      totalSignals: 0,
      byType: { VALUE: 0, SHARP_MOVE: 0, MISMATCH: 0 },
      byUrgency: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      avgStrength: 0,
      topSignal: null,
    };
  }

  const byType = { VALUE: 0, SHARP_MOVE: 0, MISMATCH: 0 };
  const byUrgency = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let totalStrength = 0;

  for (const signal of signals) {
    byType[signal.type]++;
    byUrgency[signal.urgency]++;
    totalStrength += signal.signal_strength;
  }

  const prioritized = prioritizeSignals(signals);

  return {
    totalSignals: signals.length,
    byType,
    byUrgency,
    avgStrength: totalStrength / signals.length,
    topSignal: prioritized[0] || null,
  };
}
