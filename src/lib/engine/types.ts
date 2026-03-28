/**
 * Type definitions for the betting scorer engine
 */

export interface Bet {
  id?: string;
  odds_taken: number;      // decimal odds when bet was placed
  odds_closing: number;    // closing odds (market consensus)
  stake: number;           // bet amount
  result: "win" | "loss" | "push";  // outcome
  market_type?: string;    // spread / moneyline / totals
  league?: string;         // NBA / EPL / etc
  odds_range?: string;     // for segmentation
  settled_at?: Date;
}

export interface Metrics {
  N: number;                    // sample size
  clv_avg: number;             // average closing line value
  xroi: number;                // expected ROI
  roi: number;                 // actual ROI
  confidence: number;          // 0-1, increases with N
  z_score: number;             // variance test
}

export type BettorState = "BLACK" | "RED" | "AMBER" | "GREEN";

export interface ScoringResult {
  state: BettorState;
  metrics: {
    clv: number;
    xroi: number;
    roi: number;
    confidence: number;
    z: number;
  };
  diagnosis: string;
  instruction: string;
  riskFlags: string[];
}
