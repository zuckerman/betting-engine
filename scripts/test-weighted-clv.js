#!/usr/bin/env node

/**
 * Test Suite: Weighted CLV Engine
 * 
 * Validates multi-book consensus pricing and signal quality
 */

const {
  calculateWeightedPrice,
  calculatePriceSpread,
  assessCLVStrength,
  calculateWeightedCLV,
  filterQualitySignals,
  analyzeCLVBatch,
  BOOKMAKER_WEIGHTS,
} = require("../src/lib/weighted-clv-engine")

console.log("\n🧪 WEIGHTED CLV ENGINE TEST SUITE\n" + "=".repeat(60))

let passed = 0
let failed = 0

// ============================================================================
// TEST 1: Weighted Price Calculation
// ============================================================================

console.log("\n📊 TEST 1: Weighted Price Calculation")

const test1Odds = [
  { book: "pinnacle", price: 2.00 },
  { book: "bet365", price: 2.05 },
  { book: "williamhill", price: 2.10 },
]

const weighted = calculateWeightedPrice(test1Odds)
console.log(`  Input: [Pinnacle: 2.00, Bet365: 2.05, WillHill: 2.10]`)
console.log(`  Weighted price: ${weighted.toFixed(3)}`)
console.log(`  Expected: 2.02-2.05 (Pinnacle-biased)`)

if (weighted > 2.00 && weighted < 2.08) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// TEST 2: Price Spread (Market Agreement)
// ============================================================================

console.log("\n📊 TEST 2: Price Spread (Market Agreement)")

const spreadOdds = [
  { book: "pinnacle", price: 2.00 },
  { book: "bet365", price: 2.02 },
  { book: "williamhill", price: 2.04 },
]

const spread = calculatePriceSpread(spreadOdds)
console.log(`  Input: [2.00, 2.02, 2.04]`)
console.log(`  Spread: ${(spread * 100).toFixed(2)}%`)
console.log(`  Expected: ~2%`)

if (spread > 0.01 && spread < 0.03) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// TEST 3: CLV Strength Assessment
// ============================================================================

console.log("\n📊 TEST 3: CLV Strength Assessment")

const strengthTests = [
  { clv: 0.08, expected: "STRONG" },
  { clv: 0.035, expected: "MEDIUM" },
  { clv: 0.01, expected: "WEAK" },
  { clv: -0.02, expected: "NEGATIVE" },
]

let strengthPassed = 0
for (const test of strengthTests) {
  const result = assessCLVStrength(test.clv)
  const pass = result === test.expected
  console.log(
    `  CLV ${test.clv > 0 ? "+" : ""}${(test.clv * 100).toFixed(1)}% → ${result} ${pass ? "✅" : "❌"}`
  )
  if (pass) strengthPassed++
}

console.log(`  Result: ${strengthPassed}/${strengthTests.length}`)
if (strengthPassed === strengthTests.length) {
  passed++
} else {
  failed++
}

// ============================================================================
// TEST 4: Full CLV Calculation (Main Test)
// ============================================================================

console.log("\n📊 TEST 4: Full Weighted CLV Calculation")

const clvTest = calculateWeightedCLV({
  entryOdds: 2.10,
  closingOdds: [
    { book: "pinnacle", price: 2.00 },
    { book: "bet365", price: 2.05 },
    { book: "williamhill", price: 2.10 },
  ],
})

console.log(`  Entry: 2.10`)
console.log(`  Closing consensus: ${clvTest.consensus}`)
console.log(`  CLV: ${(clvTest.clv * 100).toFixed(2)}%`)
console.log(`  Strength: ${clvTest.strength}`)
console.log(`  Valid: ${clvTest.valid}`)
console.log(`  Spread: ${(clvTest.spread * 100).toFixed(2)}%`)

if (clvTest.clv > 0 && clvTest.valid) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// TEST 5: Invalid Signal Detection (High Spread)
// ============================================================================

console.log("\n📊 TEST 5: Invalid Signal Detection (High Spread)")

const invalidTest = calculateWeightedCLV({
  entryOdds: 2.10,
  closingOdds: [
    { book: "pinnacle", price: 2.00 },
    { book: "bet365", price: 2.30 }, // Big disagreement
    { book: "williamhill", price: 2.50 },
  ],
})

console.log(`  Entry: 2.10`)
console.log(`  Closing consensus: ${invalidTest.consensus}`)
console.log(`  CLV: ${(invalidTest.clv * 100).toFixed(2)}%`)
console.log(`  Spread: ${(invalidTest.spread * 100).toFixed(2)}%`)
console.log(`  Valid: ${invalidTest.valid}`)

if (!invalidTest.valid && invalidTest.spread > 0.08) {
  console.log(`  ✅ PASS (Correctly marked invalid)`)
  passed++
} else {
  console.log(`  ❌ FAIL (Should be invalid)`)
  failed++
}

// ============================================================================
// TEST 6: Quality Signal Filtering
// ============================================================================

console.log("\n📊 TEST 6: Quality Signal Filtering")

const allResults = [
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [
      { book: "pinnacle", price: 1.95 },
      { book: "bet365", price: 1.98 },
    ],
  }), // Strong positive
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [
      { book: "pinnacle", price: 2.05 },
      { book: "bet365", price: 2.10 },
      { book: "williamhill", price: 2.50 }, // High spread
    ],
  }), // Valid but spread high
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [{ book: "pinnacle", price: 2.10 }], // Only 1 book
  }), // Too few books
]

const filtered = filterQualitySignals(allResults, {
  minBooksCount: 2,
  minStrength: "MEDIUM",
  requireValid: true,
})

console.log(`  Input: 3 results`)
console.log(`  Filtered (valid + 2+ books + MEDIUM+): ${filtered.length}`)
console.log(`  Expected: 1`)

if (filtered.length === 1) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// TEST 7: Batch Analysis
// ============================================================================

console.log("\n📊 TEST 7: Batch Analysis")

const batchResults = [
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [
      { book: "pinnacle", price: 2.00 },
      { book: "bet365", price: 2.05 },
    ],
  }), // +0.048 (STRONG)
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [
      { book: "pinnacle", price: 2.06 },
      { book: "bet365", price: 2.10 },
    ],
  }), // +0.019 (WEAK)
  calculateWeightedCLV({
    entryOdds: 2.10,
    closingOdds: [
      { book: "pinnacle", price: 2.15 },
      { book: "bet365", price: 2.20 },
    ],
  }), // -0.048 (NEGATIVE)
]

const analysis = analyzeCLVBatch(batchResults)

console.log(`  Batch size: ${analysis.count}`)
console.log(`  Avg CLV: ${(analysis.avgCLV * 100).toFixed(2)}%`)
console.log(`  Positive rate: ${(analysis.positiveRate * 100).toFixed(1)}%`)
console.log(`  Strong signals: ${analysis.strongCount}`)

if (analysis.count === 3 && analysis.positiveRate > 0.3) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// TEST 8: Bookmaker Weights
// ============================================================================

console.log("\n📊 TEST 8: Bookmaker Weight Distribution")

console.log(`  Pinnacle weight: ${BOOKMAKER_WEIGHTS.pinnacle} (should be 1.0)`)
console.log(`  Bet365 weight: ${BOOKMAKER_WEIGHTS.bet365}`)
console.log(`  WilliamHill weight: ${BOOKMAKER_WEIGHTS.williamhill}`)
console.log(`  Default weight: ${BOOKMAKER_WEIGHTS.default}`)

if (
  BOOKMAKER_WEIGHTS.pinnacle === 1.0 &&
  BOOKMAKER_WEIGHTS.bet365 < BOOKMAKER_WEIGHTS.pinnacle &&
  BOOKMAKER_WEIGHTS.williamhill < BOOKMAKER_WEIGHTS.bet365
) {
  console.log(`  ✅ PASS (Correct weight hierarchy)`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(60))
console.log(`\n📊 TEST RESULTS: ${passed}/${passed + failed} passed`)

if (failed === 0) {
  console.log(`\n✅ ALL TESTS PASSED - CLV Engine ready for production\n`)
} else {
  console.log(`\n⚠️  ${failed} test(s) failed - Review above\n`)
}

console.log("=".repeat(60) + "\n")

process.exit(failed > 0 ? 1 : 0)
