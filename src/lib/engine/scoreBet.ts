import { PredictionBet } from "./types";
import { calculateEdge } from "./edge";

export interface ScoredBet {
  won: boolean;
  profit: number;
  clv: number | null;
  edge: number;
}

/**
 * Score a single bet after settlement
 * Calculates profit, CLV, and edge
 */
export function scoreBet(bet: PredictionBet): ScoredBet {
  if (!bet.result) {
    throw new Error("Bet not settled");
  }

  const won = bet.prediction === bet.result;

  const profit = won ? (bet.odds_taken - 1) * bet.stake : -bet.stake;

  const impliedTaken = 1 / bet.odds_taken;

  const impliedClosing = bet.odds_closing ? 1 / bet.odds_closing : null;

  const clv =
    impliedClosing !== null ? impliedClosing - impliedTaken : null;

  // Calculate edge
  const { edge } = calculateEdge(bet);

  return {
    won,
    profit,
    clv,
    edge,
  };
}
