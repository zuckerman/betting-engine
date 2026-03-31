import { PredictionBet } from "./types";
import { calculateEdge } from "./edge";

export interface PortfolioMetrics {
  totalBets: number;
  totalProfit: number;
  totalStake: number;
  roi: number;
  winRate: number;
  avgEdge: number;
}

/**
 * Calculate aggregate metrics across all settled bets
 */
export function calculatePortfolioMetrics(
  bets: PredictionBet[]
): PortfolioMetrics {
  const settled = bets.filter((b) => b.status === "settled");

  const totalStake = settled.reduce((sum, b) => sum + b.stake, 0);

  const totalProfit = settled.reduce((sum, b) => {
    return sum + (b.profit ?? 0);
  }, 0);

  const wins = settled.filter(
    (b) => b.result === b.prediction
  ).length;

  const roi = totalStake > 0 ? totalProfit / totalStake : 0;

  const winRate = settled.length > 0 ? wins / settled.length : 0;

  // Calculate average edge
  const totalEdge = settled.reduce((sum, b) => {
    const { edge } = calculateEdge(b);
    return sum + edge;
  }, 0);

  const avgEdge = settled.length > 0 ? totalEdge / settled.length : 0;

  return {
    totalBets: settled.length,
    totalProfit,
    totalStake,
    roi,
    winRate,
    avgEdge,
  };
}
