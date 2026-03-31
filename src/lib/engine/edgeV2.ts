/**
 * Edge Engine V2
 * Combines model probability, market odds, and external signals
 * Produces validated edge + confidence scores
 */

export interface EdgeV2Input {
  odds: number; // market odds
  modelProb: number; // model probability (0-1)
  externalProb?: number; // Sportmonks/external signal (0-1)
  valueBet?: boolean; // Sportmonks value bet flag
}

export interface EdgeV2Output {
  edge: number; // raw edge (model - market)
  confidence: "HIGH" | "MEDIUM" | "LOW";
  marketProb: number;
  modelProb: number;
  externalProb?: number;
  agreement: number; // how close model and external agree
  shouldBet: boolean; // final decision
}

/**
 * Convert odds to implied probability
 */
function impliedProb(odds: number): number {
  return 1 / odds;
}

/**
 * Core edge computation with validation
 */
export function computeEdgeV2(input: EdgeV2Input): EdgeV2Output {
  const marketProb = impliedProb(input.odds);
  const modelProb = Math.max(0, Math.min(1, input.modelProb));

  // Raw edge: model advantage over market
  const rawEdge = modelProb - marketProb;

  // External validation (if provided)
  const externalProb = input.externalProb;
  const agreement = externalProb
    ? Math.abs(modelProb - externalProb)
    : Infinity;

  // Confidence scoring
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";

  if (rawEdge > 0) {
    // Model favours selection
    if (agreement < 0.08 || !externalProb) {
      // Model and external signal align closely (< 8% diff)
      confidence = "HIGH";
    } else if (agreement < 0.15) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }
  }

  // Additional boost for Sportmonks value bets
  if (input.valueBet && rawEdge > 0) {
    if (confidence === "LOW") confidence = "MEDIUM";
    if (confidence === "MEDIUM") confidence = "HIGH";
  }

  // Final decision: only bet if edge positive AND confidence threshold met
  const shouldBet =
    rawEdge > 0.02 && (confidence === "HIGH" || confidence === "MEDIUM");

  return {
    edge: rawEdge,
    confidence,
    marketProb,
    modelProb,
    externalProb,
    agreement,
    shouldBet,
  };
}

/**
 * Batch compute edges for multiple selections
 */
export function computeEdgesV2(
  inputs: EdgeV2Input[]
): EdgeV2Output[] {
  return inputs.map(computeEdgeV2);
}

/**
 * Filter signals: only return high-confidence, positive-edge bets
 */
export function filterValidSignals(
  edges: EdgeV2Output[]
): EdgeV2Output[] {
  return edges.filter(
    (e) =>
      e.shouldBet &&
      e.edge > 0.02 &&
      (e.confidence === "HIGH" || e.confidence === "MEDIUM")
  );
}

/**
 * Rank signals by edge quality (for display)
 */
export function rankSignals(edges: EdgeV2Output[]): EdgeV2Output[] {
  return edges.sort((a, b) => {
    // Primary: confidence level
    const confidenceScore = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    const diff = confidenceScore[b.confidence] - confidenceScore[a.confidence];
    if (diff !== 0) return diff;

    // Secondary: edge size
    return b.edge - a.edge;
  });
}
