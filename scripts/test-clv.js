#!/usr/bin/env node

/**
 * CLV Engine Test Suite
 * Tests all core CLV calculations and validation
 * 
 * Run with: node scripts/test-clv.js
 */

// ============================================================================
// CLV CALCULATIONS (embedded for testing)
// ============================================================================

function calculateCLV(entry, closing) {
  return (entry / closing) - 1
}

function validateOdds(odds) {
  return odds > 1.01 && odds < 1000 && !isNaN(odds)
}

function clvPercent(clv) {
  return `${(clv * 100).toFixed(2)}%`
}

// ============================================================================
// TEST DATA
// ============================================================================

const tests = [
  {
    name: "Perfect match - entry 2.10, closing 2.00",
    entry: 2.10,
    closing: 2.00,
    expectedCLV: 0.05, // +5%
    description: "You beat market by 5%"
  },
  {
    name: "Market shift against - entry 2.10, closing 2.30",
    entry: 2.10,
    closing: 2.30,
    expectedCLV: -0.087, // -8.7%
    description: "Market moved worse, you were lucky"
  },
  {
    name: "Massive edge - entry 1.50, closing 2.00",
    entry: 1.50,
    closing: 2.00,
    expectedCLV: -0.25, // -25%
    description: "Huge misvalue - market was wrong"
  },
  {
    name: "Slight edge - entry 3.0, closing 2.95",
    entry: 3.0,
    closing: 2.95,
    expectedCLV: 0.017, // +1.7%
    description: "Small edge, realistic scenario"
  },
  {
    name: "Break even - entry 2.0, closing 2.0",
    entry: 2.0,
    closing: 2.0,
    expectedCLV: 0.0, // 0%
    description: "Market didn't move, no edge"
  },
  {
    name: "Very long odds - entry 10.0, closing 12.0",
    entry: 10.0,
    closing: 12.0,
    expectedCLV: -0.167, // -16.7%
    description: "Edge on undervalued outsiders"
  }
]

const invalidOddsTests = [
  { odds: 1.0, shouldBeValid: false },
  { odds: 1.005, shouldBeValid: false },
  { odds: 1.02, shouldBeValid: true },
  { odds: 2.5, shouldBeValid: true },
  { odds: 500, shouldBeValid: true },
  { odds: 1001, shouldBeValid: false },
  { odds: -1, shouldBeValid: false },
  { odds: NaN, shouldBeValid: false }
]

// ============================================================================
// METRICS CALCULATION TESTS
// ============================================================================

function calculateMetrics(predictions) {
  const settled = predictions.filter(p => p.clv !== undefined)
  
  if (settled.length === 0) {
    return {
      total: predictions.length,
      settled: 0,
      avgCLV: 0,
      positiveCLVPercent: 0,
      negativeCLVPercent: 0
    }
  }

  const clvValues = settled.map(p => p.clv)
  const avgCLV = clvValues.reduce((a, b) => a + b, 0) / settled.length
  const positive = settled.filter(p => p.clv > 0.001).length
  const negative = settled.filter(p => p.clv < -0.001).length

  return {
    total: predictions.length,
    settled: settled.length,
    avgCLV,
    positiveCLVPercent: (positive / settled.length) * 100,
    negativeCLVPercent: (negative / settled.length) * 100,
    winRate: (positive / settled.length) * 100
  }
}

const metricsTests = [
  {
    name: "All predictions beating market",
    predictions: [
      { clv: 0.05 }, // +5%
      { clv: 0.03 }, // +3%
      { clv: 0.02 }  // +2%
    ],
    expectedAvg: 0.0333,
    expectedPositive: 100
  },
  {
    name: "All predictions losing to market",
    predictions: [
      { clv: -0.05 }, // -5%
      { clv: -0.03 }, // -3%
      { clv: -0.02 }  // -2%
    ],
    expectedAvg: -0.0333,
    expectedPositive: 0
  },
  {
    name: "Mixed results",
    predictions: [
      { clv: 0.05 },
      { clv: -0.03 },
      { clv: 0.02 },
      { clv: -0.08 },
      { clv: 0.01 }
    ],
    expectedAvg: -0.006,
    expectedPositive: 60
  }
]

// ============================================================================
// TEST RUNNER
// ============================================================================

console.log("\n🧪 CLV ENGINE - TEST SUITE")
console.log("═".repeat(80))

// TEST 1: CLV Calculation
console.log("\n✅ TEST 1: CLV Calculation")
console.log("-".repeat(80))

let clvPassed = 0
for (const test of tests) {
  const clv = calculateCLV(test.entry, test.closing)
  const passed = Math.abs(clv - test.expectedCLV) < 0.0001
  
  if (passed) {
    clvPassed++
    console.log(`✅ ${test.name}`)
    console.log(`   CLV: ${clvPercent(clv)} | Expected: ${clvPercent(test.expectedCLV)}`)
    console.log(`   → ${test.description}`)
  } else {
    console.log(`❌ ${test.name}`)
    console.log(`   CLV: ${clvPercent(clv)} | Expected: ${clvPercent(test.expectedCLV)}`)
  }
}

console.log(`\nResult: ${clvPassed}/${tests.length} passed`)

// TEST 2: Odds Validation
console.log("\n✅ TEST 2: Odds Validation")
console.log("-".repeat(80))

let validationPassed = 0
for (const test of invalidOddsTests) {
  const isValid = validateOdds(test.odds)
  const passed = isValid === test.shouldBeValid
  
  if (passed) {
    validationPassed++
    const result = isValid ? "VALID" : "INVALID"
    console.log(`✅ Odds ${test.odds} → ${result}`)
  } else {
    const result = isValid ? "VALID" : "INVALID"
    const expected = test.shouldBeValid ? "VALID" : "INVALID"
    console.log(`❌ Odds ${test.odds} → ${result} (expected: ${expected})`)
  }
}

console.log(`\nResult: ${validationPassed}/${invalidOddsTests.length} passed`)

// TEST 3: Metrics Calculation
console.log("\n✅ TEST 3: Metrics Calculation")
console.log("-".repeat(80))

let metricsPassed = 0
for (const test of metricsTests) {
  const metrics = calculateMetrics(test.predictions)
  const avgMatch = Math.abs(metrics.avgCLV - test.expectedAvg) < 0.001
  const positiveMatch = Math.abs(metrics.positiveCLVPercent - test.expectedPositive) < 1
  
  if (avgMatch && positiveMatch) {
    metricsPassed++
    console.log(`✅ ${test.name}`)
    console.log(`   Avg CLV: ${clvPercent(metrics.avgCLV)} | Beating Market: ${metrics.positiveCLVPercent.toFixed(1)}%`)
  } else {
    console.log(`❌ ${test.name}`)
    if (!avgMatch) {
      console.log(`   Avg CLV mismatch: ${clvPercent(metrics.avgCLV)} (expected: ${clvPercent(test.expectedAvg)})`)
    }
    if (!positiveMatch) {
      console.log(`   Positive mismatch: ${metrics.positiveCLVPercent.toFixed(1)}% (expected: ${test.expectedPositive}%)`)
    }
  }
}

console.log(`\nResult: ${metricsPassed}/${metricsTests.length} passed`)

// TEST 4: Real World Scenario
console.log("\n✅ TEST 4: Real World Scenario (14-Day Validation)")
console.log("-".repeat(80))

// Simulate a 14-day prediction run
const dayPredictions = [
  { clv: 0.012 },
  { clv: -0.008 },
  { clv: 0.025 },
  { clv: -0.003 },
  { clv: 0.015 },
  { clv: 0.008 },
  { clv: -0.010 },
  { clv: 0.022 },
  { clv: -0.005 },
  { clv: 0.031 },
  { clv: 0.006 },
  { clv: -0.014 },
  { clv: 0.018 },
  { clv: 0.009 }
]

const dayMetrics = calculateMetrics(dayPredictions)

console.log(`Predictions made: ${dayMetrics.total}`)
console.log(`Settled: ${dayMetrics.settled}`)
console.log(`Average CLV: ${clvPercent(dayMetrics.avgCLV)}`)
console.log(`Beating market: ${dayMetrics.positiveCLVPercent.toFixed(1)}%`)
console.log(`Losing to market: ${dayMetrics.negativeCLVPercent.toFixed(1)}%`)

// Check if this passes validation threshold
const validationThreshold = 0.005 // +0.5%
const passesValidation = dayMetrics.avgCLV > validationThreshold
console.log(`\nEdge Status: ${passesValidation ? "✅ POSITIVE EDGE DETECTED" : "❌ NO EDGE"}`)

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "═".repeat(80))
console.log("📊 TEST SUMMARY")
console.log("═".repeat(80))

const totalPassed = clvPassed + validationPassed + metricsPassed
const totalTests = tests.length + invalidOddsTests.length + metricsTests.length

console.log(`CLV Calculation: ${clvPassed}/${tests.length} ✅`)
console.log(`Odds Validation: ${validationPassed}/${invalidOddsTests.length} ✅`)
console.log(`Metrics Engine: ${metricsPassed}/${metricsTests.length} ✅`)
console.log(`\nTotal: ${totalPassed}/${totalTests} passed`)

if (totalPassed === totalTests) {
  console.log("\n🎯 ALL TESTS PASSING - CLV ENGINE READY FOR PRODUCTION")
} else {
  console.log(`\n⚠️  ${totalTests - totalPassed} test(s) failed`)
}

console.log("\n🔑 Key Insights:")
console.log("  • CLV = (entry / closing) - 1")
console.log("  • Positive CLV = you beat market")
console.log("  • Edge threshold = +0.5% average CLV")
console.log("  • Sample size threshold = 200+ predictions")
console.log("")
