/**
 * CLV (Closing Line Value) Engine
 * 
 * Core validation system: tracks entry odds → closing odds → CLV
 * This is the industry-standard metric for real edge detection
 */

// ============================================================================
// TYPES
// ============================================================================

export type CLVPrediction = {
  id: string
  
  // Fixture
  home: string
  away: string
  kickoff: string // ISO
  
  // Market mapping
  marketId: string
  selectionId: number
  
  // Odds at entry
  entryOdds: number
  entryTime: number // timestamp
  
  // Odds at settlement (populated later)
  closingOdds?: number
  closingTime?: number
  
  // Result (populated on settlement)
  result?: "WIN" | "LOSS" | "VOID"
  
  // CLV calculation
  clv?: number // percentage (0.05 = +5%)
  
  // Metadata
  market?: string
  league?: string
  confidence?: number // mapper confidence
  
  // Timestamps
  createdAt: number
  settledAt?: number
  settled: boolean
}

export type CLVMetrics = {
  total: number
  settled: number
  avgCLV: number
  positiveCLVPercent: number
  negativeCLVPercent: number
  breakEvenRate: number
  calibrationError: number
  winRate: number
  
  // Distribution
  clvDistribution: {
    range: string
    count: number
    percent: number
  }[]
}

// ============================================================================
// CLV CALCULATIONS
// ============================================================================

/**
 * Calculate CLV: compares entry odds vs closing odds
 * 
 * CLV = (entry / closing) - 1
 * 
 * +5% = you beat market by 5%
 * -5% = market beat you by 5%
 */
export function calculateCLV(entryOdds: number, closingOdds: number): number {
  if (entryOdds < 1.01 || closingOdds < 1.01) {
    return 0
  }
  
  return (entryOdds / closingOdds) - 1
}

/**
 * Validate odds are sensible
 */
export function validateOdds(odds: number): boolean {
  return odds > 1.01 && odds < 1000 && !isNaN(odds)
}

/**
 * Convert CLV decimal to percentage string
 */
export function clvPercent(clv: number): string {
  return `${(clv * 100).toFixed(2)}%`
}

// ============================================================================
// PREDICTION LIFECYCLE
// ============================================================================

/**
 * Create prediction record at time of bet
 */
export function createPredictionRecord(
  data: {
    home: string
    away: string
    kickoff: string
    marketId: string
    selectionId: number
    entryOdds: number
    market?: string
    league?: string
    confidence?: number
  }
): CLVPrediction {
  
  if (!validateOdds(data.entryOdds)) {
    throw new Error(`Invalid entry odds: ${data.entryOdds}`)
  }

  return {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    home: data.home,
    away: data.away,
    kickoff: data.kickoff,
    marketId: data.marketId,
    selectionId: data.selectionId,
    entryOdds: data.entryOdds,
    entryTime: Date.now(),
    market: data.market || "Match Odds",
    league: data.league,
    confidence: data.confidence,
    createdAt: Date.now(),
    settled: false
  }
}

/**
 * Settle a prediction with closing odds
 */
export function settlePrediction(
  prediction: CLVPrediction,
  closingOdds: number
): CLVPrediction {
  
  if (!validateOdds(closingOdds)) {
    throw new Error(`Invalid closing odds: ${closingOdds}`)
  }

  const clv = calculateCLV(prediction.entryOdds, closingOdds)

  return {
    ...prediction,
    closingOdds,
    closingTime: Date.now(),
    clv,
    settledAt: Date.now(),
    settled: true
  }
}

// ============================================================================
// BATCH SETTLEMENT (runs every 30 mins)
// ============================================================================

/**
 * Determine if prediction should be settled
 * 
 * Rules:
 * 1. Must have kickoff time
 * 2. Match must have finished (kickoff + 2.5h buffer)
 * 3. Not already settled
 */
export function shouldSettle(prediction: CLVPrediction): boolean {
  if (prediction.settled) return false
  
  const kickoffTime = new Date(prediction.kickoff).getTime()
  const now = Date.now()
  
  // Match finished + 2.5h buffer (full time + halftime + injuries)
  const matchFinishBuffer = 2.5 * 60 * 60 * 1000
  
  return now >= kickoffTime + matchFinishBuffer
}

/**
 * Batch settle multiple predictions
 */
export function settleBatch(
  predictions: CLVPrediction[],
  oddsLookup: Record<string, number>
): {
  settled: CLVPrediction[]
  failed: CLVPrediction[]
  skipped: CLVPrediction[]
} {
  
  const settled: CLVPrediction[] = []
  const failed: CLVPrediction[] = []
  const skipped: CLVPrediction[] = []

  for (const pred of predictions) {
    if (!shouldSettle(pred)) {
      skipped.push(pred)
      continue
    }

    const key = `${pred.marketId}_${pred.selectionId}`
    const closingOdds = oddsLookup[key]

    if (!closingOdds || !validateOdds(closingOdds)) {
      failed.push(pred)
      continue
    }

    try {
      const settled_pred = settlePrediction(pred, closingOdds)
      settled.push(settled_pred)
    } catch (err) {
      failed.push(pred)
    }
  }

  return { settled, failed, skipped }
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate CLV metrics from settled predictions
 */
export function calculateMetrics(predictions: CLVPrediction[]): CLVMetrics {
  
  const settled = predictions.filter(p => p.settled && p.clv !== undefined)
  
  if (settled.length === 0) {
    return {
      total: predictions.length,
      settled: 0,
      avgCLV: 0,
      positiveCLVPercent: 0,
      negativeCLVPercent: 0,
      breakEvenRate: 0,
      calibrationError: 0,
      winRate: 0,
      clvDistribution: []
    }
  }

  // CLV average
  const clvValues = settled.map(p => p.clv || 0)
  const avgCLV = clvValues.reduce((a, b) => a + b, 0) / settled.length

  // Counts
  const positive = settled.filter(p => (p.clv || 0) > 0.001).length
  const negative = settled.filter(p => (p.clv || 0) < -0.001).length
  const breakEven = settled.filter(p => Math.abs(p.clv || 0) <= 0.001).length

  // Distribution
  const distribution = createCLVDistribution(clvValues)

  // Calibration error (will be 0 until we add win/loss prediction)
  const calibrationError = 0

  // Win rate (tracked separately - for now just positive CLV rate)
  const winRate = positive / settled.length

  return {
    total: predictions.length,
    settled: settled.length,
    avgCLV,
    positiveCLVPercent: (positive / settled.length) * 100,
    negativeCLVPercent: (negative / settled.length) * 100,
    breakEvenRate: (breakEven / settled.length) * 100,
    calibrationError,
    winRate,
    clvDistribution: distribution
  }
}

/**
 * Create CLV distribution buckets for visualization
 */
function createCLVDistribution(
  clvValues: number[]
): CLVMetrics["clvDistribution"] {
  
  const buckets = [
    { range: "< -20%", min: -Infinity, max: -0.2 },
    { range: "-20% to -10%", min: -0.2, max: -0.1 },
    { range: "-10% to 0%", min: -0.1, max: 0 },
    { range: "0% to 10%", min: 0, max: 0.1 },
    { range: "10% to 20%", min: 0.1, max: 0.2 },
    { range: "> 20%", min: 0.2, max: Infinity }
  ]

  const total = clvValues.length

  return buckets.map(bucket => {
    const count = clvValues.filter(
      v => v > bucket.min && v <= bucket.max
    ).length

    return {
      range: bucket.range,
      count,
      percent: (count / total) * 100
    }
  })
}

// ============================================================================
// VALIDATION & RED FLAGS
// ============================================================================

export type RedFlags = {
  highVariance: boolean
  lowSampleSize: boolean
  poorCalibration: boolean
  noPositiveEdge: boolean
  unreliableMarkets: boolean
}

/**
 * Identify red flags in your edge
 */
export function detectRedFlags(
  predictions: CLVPrediction[],
  metrics: CLVMetrics
): RedFlags {
  
  const settled = predictions.filter(p => p.settled)
  
  // Calculate variance
  const clvValues = settled.map(p => p.clv || 0)
  const mean = metrics.avgCLV
  const variance = clvValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / clvValues.length
  const stdDev = Math.sqrt(variance)

  return {
    // High variance = inconsistent edge
    highVariance: stdDev > 0.1,
    
    // Sample size < 200 = not enough data
    lowSampleSize: settled.length < 200,
    
    // Calibration > 5% = model is wrong
    poorCalibration: metrics.calibrationError > 0.05,
    
    // No positive CLV = no edge
    noPositiveEdge: metrics.avgCLV <= 0,
    
    // Low confidence matches = unreliable markets
    unreliableMarkets: predictions.filter(p => (p.confidence || 0) < 0.75).length / predictions.length > 0.3
  }
}

// ============================================================================
// FORMATTING & DISPLAY
// ============================================================================

/**
 * Format metrics for dashboard display
 */
export function formatMetricsForDisplay(metrics: CLVMetrics) {
  return {
    total: metrics.total,
    settled: metrics.settled,
    avgCLV: `${clvPercent(metrics.avgCLV)}`,
    positiveCLVPercent: `${metrics.positiveCLVPercent.toFixed(1)}%`,
    negativeCLVPercent: `${metrics.negativeCLVPercent.toFixed(1)}%`,
    winRate: `${(metrics.winRate * 100).toFixed(1)}%`,
    calibrationError: `${(metrics.calibrationError * 100).toFixed(2)}%`,
    distribution: metrics.clvDistribution
  }
}

/**
 * Format single prediction for API response
 */
export function formatPredictionResponse(pred: CLVPrediction) {
  return {
    id: pred.id,
    match: `${pred.home} vs ${pred.away}`,
    kickoff: pred.kickoff,
    entryOdds: pred.entryOdds,
    closingOdds: pred.closingOdds || "pending",
    clv: pred.clv ? clvPercent(pred.clv) : "pending",
    settled: pred.settled,
    createdAt: new Date(pred.createdAt).toISOString(),
    settledAt: pred.settledAt ? new Date(pred.settledAt).toISOString() : null
  }
}
