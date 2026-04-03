#!/usr/bin/env node

/**
 * Test Suite: Weighted CLV Engine (Pure JS)
 * 
 * Validates multi-book consensus pricing and signal quality
 */

// ============================================================================
// INLINED CLV ENGINE LOGIC
// ============================================================================

const BOOKMAKER_WEIGHTS = {
  pinnacle: 1.0,
  pinnacle_exchange: 1.0,
  bet365: 0.85,
  betfair: 0.85,
  betway: 0.85,
  skybet: 0.85,
  williamhill: 0.75,
  ladbrokes: 0.75,
  coral: 0.75,
  "888sport": 0.75,
  unibet: 0.65,
  leovegas: 0.65,
  default: 0.7,
}

function calculateWeightedPrice(odds) {
  if (!odds || odds.length === 0) return 0

  let totalWeight = 0
  let weightedSum = 0

  for (const o of odds) {
    const weight = BOOKMAKER_WEIGHTS[o.book] || BOOKMAKER_WEIGHTS.default
    weightedSum += o.price * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

function calculatePriceSpread(odds) {
  if (!odds || odds.length === 0) return 0

  const prices = odds.map((o) => o.price)
  const max = Math.max(...prices)
  const min = Math.min(...prices)

  if (min === 0) return 0
  return (max - min) / min
}

function assessCLVStrength(clv) {
  if (clv < 0) return "NEGATIVE"
  if (clv > 0.05) return "STRONG"
  if (clv > 0.02) return "MEDIUM"
  if (clv > 0) return "WEAK"
  return "NEGATIVE"
}

function calculateWeightedCLV({ entryOdds, closingOdds }) {
  if (!entryOdds || !closingOdds || closingOdds.length === 0) {
    return null
  }

  if (entryOdds < 1.01 || entryOdds > 1000) {
    return null
  }

  const prices = closingOdds.map((o) => o.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const consensusPrice = calculateWeightedPrice(closingOdds)
  const spreadPct = calculatePriceSpread(closingOdds)

  const clv = consensusPrice > 0 ? entryOdds / consensusPrice - 1 : 0
  const strength = assessCLVStrength(clv)
  const isValid = spreadPct < 0.08

  return {
    clv: parseFloat(clv.toFixed(4)),
    consensus: parseFloat(consensusPrice.toFixed(2)),
    spread: parseFloat(spreadPct.toFixed(4)),
    strength,
    valid: isValid,
    booksCount: closingOdds.length,
    details: {
      entry: entryOdds,
      min: minPrice,
      max: maxPrice,
      spreadPct: parseFloat((spreadPct * 100).toFixed(2)),
    },
  }
}

function filterQualitySignals(results, options = {}) {
  const {
    minBooksCount = 2,
    minStrength = "WEAK",
    requireValid = true,
  } = options

  const strengthOrder = { NEGATIVE: 0, WEAK: 1, MEDIUM: 2, STRONG: 3 }

  return results.filter((result) => {
    if (!result) return false
    if (result.booksCount < minBooksCount) return false
    if (strengthOrder[result.strength] < strengthOrder[minStrength]) return false
    if (requireValid && !result.valid) return false
    return true
  })
}

function analyzeCLVBatch(results) {
  if (!results.length) {
    return {
      count: 0,
      avgCLV: 0,
      positiveCount: 0,
      positiveRate: 0,
      strongCount: 0,
      avgSpread: 0,
      validCount: 0,
    }
  }

  const clvValues = results.map((r) => r.clv)
  const positiveCount = clvValues.filter((c) => c > 0).length
  const strongCount = results.filter((r) => r.strength === "STRONG").length
  const validCount = results.filter((r) => r.valid).length
  const avgSpread = results.reduce((sum, r) => sum + r.spread, 0) / results.length

  return {
    count: results.length,
    avgCLV: clvValues.reduce((a, b) => a + b, 0) / results.length,
    positiveCount,
    positiveRate: positiveCount / results.length,
    strongCount,
    strongRate: strongCount / results.length,
    avgSpread,
    validCount,
    validRate: validCount / results.length,
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log("\n🧪 WEIGHTED CLV ENGINE TEST SUITE\n" + "=".repeat(60))

let passed = 0
let failed = 0

// TEST 1
console.log("\n📊 TEST 1: Weighted Price Calculation")
const test1Odds = [
  { book: "pinnacle", price: 2.0 },
  { book: "bet365", price: 2.05 },
  { book: "williamhill", price: 2.1 },
]
const weighted = calculateWeightedPrice(test1Odds)
console.log(`  Input: [Pinnacle: 2.00, Bet365: 2.05, WillHill: 2.10]`)
console.log(`  Weighted price: ${weighted.toFixed(3)}`)
if (weighted > 2.0 && weighted < 2.08) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 2
console.log("\n📊 TEST 2: Price Spread (Market Agreement)")
const spreadOdds = [
  { book: "pinnacle", price: 2.0 },
  { book: "bet365", price: 2.02 },
  { book: "williamhill", price: 2.04 },
]
const spread = calculatePriceSpread(spreadOdds)
console.log(`  Input: [2.00, 2.02, 2.04]`)
console.log(`  Spread: ${(spread * 100).toFixed(2)}%`)
if (spread > 0.01 && spread < 0.03) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 3
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
if (strengthPassed === strengthTests.length) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 4
console.log("\n📊 TEST 4: Full Weighted CLV Calculation")
const clvTest = calculateWeightedCLV({
  entryOdds: 2.1,
  closingOdds: [
    { book: "pinnacle", price: 2.0 },
    { book: "bet365", price: 2.05 },
    { book: "williamhill", price: 2.1 },
  ],
})
console.log(`  Entry: 2.10`)
console.log(`  Closing consensus: ${clvTest.consensus}`)
console.log(`  CLV: ${(clvTest.clv * 100).toFixed(2)}%`)
console.log(`  Strength: ${clvTest.strength}`)
console.log(`  Valid: ${clvTest.valid}`)
if (clvTest.clv > 0 && clvTest.valid) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 5
console.log("\n📊 TEST 5: Invalid Signal Detection (High Spread)")
const invalidTest = calculateWeightedCLV({
  entryOdds: 2.1,
  closingOdds: [
    { book: "pinnacle", price: 2.0 },
    { book: "bet365", price: 2.3 },
    { book: "williamhill", price: 2.5 },
  ],
})
console.log(`  Entry: 2.10`)
console.log(`  Closing consensus: ${invalidTest.consensus}`)
console.log(`  Spread: ${(invalidTest.spread * 100).toFixed(2)}%`)
console.log(`  Valid: ${invalidTest.valid}`)
if (!invalidTest.valid && invalidTest.spread > 0.08) {
  console.log(`  ✅ PASS (Correctly marked invalid)`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 6
console.log("\n📊 TEST 6: Quality Signal Filtering")
const allResults = [
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [
      { book: "pinnacle", price: 1.95 },
      { book: "bet365", price: 1.98 },
    ],
  }),
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [
      { book: "pinnacle", price: 2.05 },
      { book: "bet365", price: 2.1 },
      { book: "williamhill", price: 2.5 },
    ],
  }),
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [{ book: "pinnacle", price: 2.1 }],
  }),
]
const filtered = filterQualitySignals(allResults, {
  minBooksCount: 2,
  minStrength: "MEDIUM",
  requireValid: true,
})
console.log(`  Input: 3 results`)
console.log(`  Filtered (valid + 2+ books + MEDIUM+): ${filtered.length}`)
if (filtered.length === 1) {
  console.log(`  ✅ PASS`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// TEST 7
console.log("\n📊 TEST 7: Batch Analysis")
const batchResults = [
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [
      { book: "pinnacle", price: 2.0 },
      { book: "bet365", price: 2.05 },
    ],
  }),
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [
      { book: "pinnacle", price: 2.06 },
      { book: "bet365", price: 2.1 },
    ],
  }),
  calculateWeightedCLV({
    entryOdds: 2.1,
    closingOdds: [
      { book: "pinnacle", price: 2.15 },
      { book: "bet365", price: 2.2 },
    ],
  }),
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

// TEST 8
console.log("\n📊 TEST 8: Bookmaker Weight Distribution")
console.log(`  Pinnacle weight: ${BOOKMAKER_WEIGHTS.pinnacle}`)
console.log(`  Bet365 weight: ${BOOKMAKER_WEIGHTS.bet365}`)
console.log(`  WilliamHill weight: ${BOOKMAKER_WEIGHTS.williamhill}`)
if (
  BOOKMAKER_WEIGHTS.pinnacle === 1.0 &&
  BOOKMAKER_WEIGHTS.bet365 < BOOKMAKER_WEIGHTS.pinnacle &&
  BOOKMAKER_WEIGHTS.williamhill < BOOKMAKER_WEIGHTS.bet365
) {
  console.log(`  ✅ PASS (Correct hierarchy)`)
  passed++
} else {
  console.log(`  ❌ FAIL`)
  failed++
}

// SUMMARY
console.log("\n" + "=".repeat(60))
console.log(`\n📊 RESULTS: ${passed}/${passed + failed} tests passed`)

if (failed === 0) {
  console.log(`\n✅ ALL TESTS PASSED\n`)
} else {
  console.log(`\n⚠️  ${failed} test(s) failed\n`)
}

console.log("=".repeat(60) + "\n")

process.exit(failed > 0 ? 1 : 0)
