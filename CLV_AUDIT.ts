/**
 * CLV Pipeline Audit
 * 
 * This file verifies the entire edge calculation and CLV measurement system
 * BEFORE we have real data. This is critical - wrong measurement = worthless results.
 */

/**
 * FORMULA 1: IMPLIED PROBABILITY (from opening odds)
 * 
 * This is the bookmaker's assessment of probability
 */
function impliedProbability(odds: number): number {
  return 1 / odds;
}

// ✅ TEST 1: Implied Probability
console.log("=== TEST 1: IMPLIED PROBABILITY ===");
const testOdds = [
  { odds: 2.0, expected_implied: 0.5 },
  { odds: 1.5, expected_implied: 0.667 },
  { odds: 3.0, expected_implied: 0.333 },
  { odds: 1.8, expected_implied: 0.556 },
];

testOdds.forEach(({ odds, expected_implied }) => {
  const calculated = impliedProbability(odds);
  const match = Math.abs(calculated - expected_implied) < 0.001;
  console.log(
    `Odds ${odds} → Implied ${calculated.toFixed(3)} (expect ${expected_implied.toFixed(3)}) ${match ? "✅" : "❌"}`
  );
});

/**
 * FORMULA 2: EDGE (what you beat the market BY)
 * 
 * edge = model_probability - implied_probability
 * 
 * This is NOT EV. This is just the gap between your estimate and theirs.
 * Positive edge = you think it's more likely than bookmaker
 * Negative edge = you think it's less likely
 */
function calculateEdge(
  modelProbability: number,
  oddsOffered: number
): number {
  const implied = impliedProbability(oddsOffered);
  return modelProbability - implied;
}

// ✅ TEST 2: Edge Calculation
console.log("\n=== TEST 2: EDGE CALCULATION ===");
const testCases = [
  {
    model: 0.60,
    odds: 2.0, // implied 0.50
    expected_edge: 0.10,
    description: "Model says 60%, market says 50% → +10% edge",
  },
  {
    model: 0.55,
    odds: 1.8, // implied 0.556
    expected_edge: -0.006,
    description: "Model says 55%, market says 55.6% → -0.6% edge",
  },
  {
    model: 0.70,
    odds: 3.0, // implied 0.333
    expected_edge: 0.367,
    description: "Model says 70%, market says 33.3% → +36.7% edge",
  },
];

testCases.forEach(({ model, odds, expected_edge, description }) => {
  const edge = calculateEdge(model, odds);
  const match = Math.abs(edge - expected_edge) < 0.001;
  console.log(
    `${description} → Calculated: ${(edge * 100).toFixed(1)}% ${match ? "✅" : "❌"}`
  );
});

/**
 * FORMULA 3: CLOSING LINE VALUE (CLV)
 * 
 * CLV measures whether you got better odds than the market's FINAL assessment
 * 
 * If you bet at odds X, and market closes at odds Y:
 *   CLV = (1 / closing_odds) - (1 / opening_odds)
 * 
 * This gives you the "probability advantage" you had at opening vs closing
 * 
 * Positive CLV = you got better odds than market eventually settled on
 * Negative CLV = market got better odds than you
 * 
 * KEY INSIGHT: CLV is INDEPENDENT of whether you won or lost
 * It only measures whether you beat the closing line
 */
function calculateCLV(
  openingOdds: number,
  closingOdds: number
): number {
  const openingImplied = impliedProbability(openingOdds);
  const closingImplied = impliedProbability(closingOdds);
  return closingImplied - openingImplied;
}

// ✅ TEST 3: CLV Calculation
console.log("\n=== TEST 3: CLV CALCULATION (vs Closing Line) ===");
const clvTests = [
  {
    opening: 2.0, // You bet at 2.0 (50% implied)
    closing: 1.9, // Market closes at 1.9 (52.6% implied)
    result: "win",
    expected_clv: 0.026,
    description:
      "You got 2.0, market closed at 1.9 (worse for backers) → +2.6% CLV",
  },
  {
    opening: 2.0, // You bet at 2.0 (50% implied)
    closing: 2.1, // Market closes at 2.1 (47.6% implied)
    result: "loss",
    expected_clv: -0.023,
    description:
      "You got 2.0, market closed at 2.1 (better for backers) → -2.3% CLV",
  },
  {
    opening: 1.5, // You bet at 1.5 (66.7% implied)
    closing: 1.5, // Market closes at 1.5
    result: "win",
    expected_clv: 0.0,
    description: "Odds stayed same → 0% CLV",
  },
];

clvTests.forEach(({ opening, closing, result, expected_clv, description }) => {
  const clv = calculateCLV(opening, closing);
  const match = Math.abs(clv - expected_clv) < 0.001;
  console.log(
    `${description} (result: ${result})\nCalculated CLV: ${(clv * 100).toFixed(2)}% ${match ? "✅" : "❌"}\n`
  );
});

/**
 * FORMULA 4: PROBABILITY CALIBRATION
 * 
 * This checks if your model's stated probabilities match reality
 * 
 * If your model says 60%, and it actually wins 60% of the time → CALIBRATED
 * If it says 60%, but wins only 45% of the time → OVERCONFIDENT
 * If it says 60%, but wins 75% of the time → UNDERCONFIDENT
 */
function checkCalibration(
  predictions: Array<{
    modelProb: number;
    actual: boolean;
  }>
): number {
  if (predictions.length === 0) return 0;
  const avgModelProb = predictions.reduce((sum, p) => sum + p.modelProb, 0) / predictions.length;
  const actualWinRate = predictions.filter((p) => p.actual).length / predictions.length;
  return avgModelProb - actualWinRate; // 0 = perfect calibration
}

// ✅ TEST 4: Calibration Check
console.log("\n=== TEST 4: PROBABILITY CALIBRATION ===");
const calibrationData = [
  { modelProb: 0.60, actual: true },
  { modelProb: 0.60, actual: true },
  { modelProb: 0.60, actual: false },
  { modelProb: 0.55, actual: true },
  { modelProb: 0.65, actual: false },
];

const calibrationError = checkCalibration(calibrationData);
console.log(
  `Model avg prob: ${(calibrationData.reduce((sum, p) => sum + p.modelProb, 0) / calibrationData.length).toFixed(2)}`
);
console.log(
  `Actual win rate: ${(calibrationData.filter((p) => p.actual).length / calibrationData.length).toFixed(2)}`
);
console.log(
  `Calibration error: ${(calibrationError * 100).toFixed(2)}% ${Math.abs(calibrationError) < 0.05 ? "✅ GOOD" : "❌ OVERCONFIDENT"}`
);

/**
 * FORMULA 5: EXPECTED VALUE vs CLV
 * 
 * These are DIFFERENT metrics
 * 
 * EV = (probability_win * odds_if_win) - (probability_loss * 1)
 *    = This is what you expect to make per unit staked
 * 
 * CLV = (1 / closing_odds) - (1 / opening_odds)
 *     = This is whether you beat the market closing line
 * 
 * You want HIGH CLV, not high EV
 * EV can be positive but still lose money if you're overconfident
 */
function calculateEV(
  modelProbability: number,
  odds: number
): number {
  const win = modelProbability * (odds - 1);
  const loss = (1 - modelProbability) * (-1);
  return win + loss;
}

console.log("\n=== TEST 5: EV vs CLV (DIFFERENT METRICS) ===");
console.log(
  `Odds 2.0, model 60% → EV: ${(calculateEV(0.6, 2.0) * 100).toFixed(1)}% per bet`
);
console.log(`Odds 2.0 → Opening implied 50%`);
console.log(
  `Closing at 1.9 → CLV: ${(calculateCLV(2.0, 1.9) * 100).toFixed(2)}% (beat the line)\n`
);

console.log("KEY: High CLV means you beat the market");
console.log("     High EV just means your model is confident (could be wrong)\n");

/**
 * FORMULA 6: ACTUAL ROI from CLV + Result
 * 
 * If you win: profit = odds - 1
 * If you lose: profit = -1
 * 
 * ROI = total_profit / total_stake
 * 
 * CLV tells you if you beat the line
 * Profit tells you if you picked winners
 * These are NOT the same!
 */
function analyzeOutcome(
  openingOdds: number,
  closingOdds: number,
  result: "win" | "loss"
): object {
  const clv = calculateCLV(openingOdds, closingOdds);
  const profit = result === "win" ? openingOdds - 1 : -1;
  const roi = profit * 100; // Per unit staked

  return {
    opening_odds: openingOdds,
    closing_odds: closingOdds,
    result,
    clv: (clv * 100).toFixed(2) + "%",
    profit: profit.toFixed(2),
    roi: roi.toFixed(1) + "%",
    insight:
      result === "win"
        ? clv > 0
          ? "Won AND beat the line (best case)"
          : "Won but got worse odds than close (unlucky)"
        : clv > 0
          ? "Lost but beat the line (good bet, unlucky result)"
          : "Lost AND got worse odds (bad bet)",
  };
}

console.log("=== TEST 6: OUTCOME ANALYSIS ===\n");

const outcomes = [
  { opening: 2.0, closing: 1.9, result: "win" as const },
  { opening: 2.0, closing: 1.9, result: "loss" as const },
  { opening: 2.0, closing: 2.1, result: "win" as const },
  { opening: 2.0, closing: 2.1, result: "loss" as const },
];

outcomes.forEach((o) => {
  const analysis = analyzeOutcome(o.opening, o.closing, o.result);
  console.log(JSON.stringify(analysis, null, 2));
  console.log("");
});

/**
 * SUMMARY: What CLV Actually Measures
 */
console.log("=== SUMMARY: THE 4-METRIC FRAMEWORK ===\n");

console.log("1. MODEL CALIBRATION");
console.log("   → Do your stated probabilities match reality?");
console.log("   → Check: Avg model prob vs actual win rate");
console.log("   → Target: Difference < 5%\n");

console.log("2. EDGE (vs Opening Odds)");
console.log("   → Do you disagree with the market in a profitable way?");
console.log("   → Check: Model prob - implied prob");
console.log("   → Target: Positive, ideally +1% to +5%\n");

console.log("3. CLV (vs Closing Odds)");
console.log("   → Did you beat the market's FINAL assessment?");
console.log("   → Check: (1/closing) - (1/opening)");
console.log("   → Target: Positive (you got better odds)\n");

console.log("4. ACTUAL RESULTS");
console.log("   → Did you pick winners?");
console.log("   → Check: Win% and ROI");
console.log("   → Note: This is separate from CLV\n");

console.log("KEY INSIGHT: You can beat the line (positive CLV) and still lose money");
console.log("if you don't pick enough winners. But positive CLV over 300+ bets + 55%");
console.log("winners = REAL EDGE.\n");
