/**
 * SHARP-ONLY CLV ENGINE
 * 
 * Only measures CLV against professional/efficient bookmakers.
 * Filters out soft books (Bet365, SkyBet, etc.)
 * 
 * Philosophy: If you beat SHARP books, you have REAL edge
 */

const SHARP_BOOKS = [
  "pinnacle",      // gold standard
  "matchbook",     // exchange-like, sharp
  "betfair_ex",    // exchange (if available)
];

const SOFT_BOOKS = [
  "bet365",
  "skybet",
  "ladbrokes",
  "williamhill",
  "betvictor",
  "888sport",
];

export interface SharpOddsSnapshot {
  book: string;
  price: number;
  timestamp: number;
}

export interface SharpCLVResult {
  entryOdds: number;
  sharpPrices: number[];
  consensus: number;
  clv: number;
  clvPercent: number;
  bookCount: number;
  isStrong: boolean; // > 2%
  isValid: boolean;
  reason?: string;
}

export interface ExecutionDecision {
  shouldEnter: boolean;
  reason: string;
  timing: "too_early" | "optimal" | "too_late" | "unknown";
  drift: "rising" | "falling" | "stable";
}

/**
 * Filter odds data to ONLY sharp bookmakers
 */
export function extractSharpPrices(
  oddsData: any,
  teamName: string
): SharpOddsSnapshot[] {
  if (!oddsData?.bookmakers) return [];

  const snapshots: SharpOddsSnapshot[] = [];

  for (const bookmaker of oddsData.bookmakers) {
    // Only process sharp books
    if (!SHARP_BOOKS.includes(bookmaker.key)) {
      continue;
    }

    // Get first market (h2h)
    const market = bookmaker.markets?.[0];
    if (!market) continue;

    // Find matching outcome
    const outcome = market.outcomes?.find(
      (o: any) => o.name === teamName || o.name?.includes(teamName)
    );

    if (outcome?.price) {
      snapshots.push({
        book: bookmaker.key,
        price: outcome.price,
        timestamp: Date.now(),
      });
    }
  }

  return snapshots;
}

/**
 * Calculate consensus from sharp prices (simple average, no weighting needed)
 */
export function calculateSharpConsensus(prices: number[]): number {
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

/**
 * Measure spread between sharp books (for validation)
 */
export function calculateSharpSpread(prices: number[]): number {
  if (prices.length <= 1) return 0;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Spread as percentage
  return (max - min) / min;
}

/**
 * Calculate CLV against sharp consensus
 */
export function calculateSharpCLV({
  entryOdds,
  sharpPrices,
}: {
  entryOdds: number;
  sharpPrices: number[];
}): SharpCLVResult | null {
  // Require at least 1 sharp price
  if (sharpPrices.length === 0) {
    return {
      entryOdds,
      sharpPrices: [],
      consensus: 0,
      clv: 0,
      clvPercent: 0,
      bookCount: 0,
      isStrong: false,
      isValid: false,
      reason: "No sharp prices available",
    };
  }

  const consensus = calculateSharpConsensus(sharpPrices);
  const spread = calculateSharpSpread(sharpPrices);

  // CLV: how much better our odds vs market
  const clv = entryOdds / consensus - 1;
  const clvPercent = clv * 100;

  // Only valid if:
  // 1. We have at least 1 sharp price
  // 2. Spread is reasonable (< 5% for sharp books)
  const isValid =
    sharpPrices.length > 0 &&
    spread < 0.05 &&
    entryOdds > 1.0 &&
    consensus > 1.0;

  // Strong signal: > 2%
  const isStrong = clvPercent > 2;

  return {
    entryOdds,
    sharpPrices,
    consensus,
    clv,
    clvPercent,
    bookCount: sharpPrices.length,
    isStrong,
    isValid,
  };
}

/**
 * Assess if we should enter based on price movement
 */
export function assessExecutionDrift(
  previousPrice: number,
  currentPrice: number
): "rising" | "falling" | "stable" {
  const change = currentPrice - previousPrice;
  const changePercent = change / previousPrice;

  if (Math.abs(changePercent) < 0.005) return "stable"; // <0.5% = stable
  if (change > 0) return "rising";
  return "falling";
}

/**
 * Generate execution decision based on timing and drift
 */
export function getExecutionDecision({
  hoursBeforeKickoff,
  priceDrift,
  edge,
}: {
  hoursBeforeKickoff: number;
  priceDrift: "rising" | "falling" | "stable";
  edge: number;
}): ExecutionDecision {
  // Edge must exist
  if (edge < 0.02) {
    return {
      shouldEnter: false,
      reason: "Edge too small (< 2%)",
      timing: "unknown",
      drift: priceDrift,
    };
  }

  // Timing zones
  let timing: "too_early" | "optimal" | "too_late" | "unknown" = "unknown";
  let shouldEnter = false;

  if (hoursBeforeKickoff > 6) {
    timing = "too_early";
    shouldEnter = false;
  } else if (hoursBeforeKickoff >= 1 && hoursBeforeKickoff <= 6) {
    timing = "optimal";
    // In optimal window, take if price is falling or stable
    shouldEnter = priceDrift !== "rising";
  } else if (hoursBeforeKickoff < 1) {
    timing = "too_late";
    shouldEnter = false;
  }

  return {
    shouldEnter,
    reason:
      timing === "optimal"
        ? priceDrift === "falling"
          ? "Optimal timing + price falling = ENTER"
          : "Optimal timing + stable = ENTER"
        : `${timing} (${hoursBeforeKickoff.toFixed(1)}h before KO)`,
    timing,
    drift: priceDrift,
  };
}

/**
 * Execution score (0-100)
 */
export function calculateExecutionScore({
  timing,
  drift,
  spread,
}: {
  timing: number; // 0-1 (1 = perfect timing)
  drift: "rising" | "falling" | "stable"; // direction
  spread: number; // 0-1 (1 = no spread = perfect)
}): number {
  const driftScore = drift === "falling" ? 1.0 : drift === "stable" ? 0.7 : 0.0;

  return (
    Math.round(
      timing * 0.4 +
        driftScore * 0.4 +
        spread * 0.2
    ) * 100 / 100
  );
}

/**
 * Filter results to only high-quality sharp signals
 */
export function filterQualitySharpSignals(
  results: SharpCLVResult[]
): SharpCLVResult[] {
  return results.filter(
    (r) =>
      r.isValid && // passes validation
      r.bookCount >= 1 && // at least 1 sharp book
      r.clvPercent >= 2 // at least 2% edge
  );
}

/**
 * Batch analysis of sharp CLV results
 */
export function analyzeSharpCLVBatch(results: SharpCLVResult[]) {
  if (results.length === 0) {
    return {
      count: 0,
      validCount: 0,
      avgCLVPercent: 0,
      positiveRate: 0,
      strongSignals: 0,
      avgBookCount: 0,
    };
  }

  const valid = results.filter((r) => r.isValid);
  const positive = results.filter((r) => r.clv > 0);
  const strong = results.filter((r) => r.isStrong);

  return {
    count: results.length,
    validCount: valid.length,
    avgCLVPercent: 
      valid.length > 0
        ? valid.reduce((sum, r) => sum + r.clvPercent, 0) / valid.length
        : 0,
    positiveRate: 
      results.length > 0
        ? (positive.length / results.length) * 100
        : 0,
    strongSignals: strong.length,
    avgBookCount:
      results.length > 0
        ? results.reduce((sum, r) => sum + r.bookCount, 0) / results.length
        : 0,
  };
}

/**
 * Check if enough sharp books are covering this market
 */
export function hasAdequateSharpCoverage(
  snapshots: SharpOddsSnapshot[],
  minBooks: number = 1
): boolean {
  return snapshots.length >= minBooks;
}
