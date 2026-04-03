/**
 * Betfair Fixture → Market Mapper
 * 
 * Maps predictions to correct Betfair markets with runner extraction
 * Handles team name variations, timezone tolerance, confidence scoring
 */

// ============================================================================
// TYPES
// ============================================================================

export type Prediction = {
  home: string
  away: string
  kickoff: string // ISO format
  fixture_id?: string
  league?: string
}

export type BetfairRunner = {
  selectionId: number
  runnerName: string
  status?: string
}

export type BetfairMarket = {
  marketId: string
  marketName: string
  marketStartTime: string
  marketType?: string
  event?: {
    id?: string
    name: string
    countryCode?: string
    timezone?: string
  }
  competition?: {
    id?: string
    name: string
  }
  runners: BetfairRunner[]
}

export type MapperResult = {
  marketId: string
  homeRunnerId: number
  awayRunnerId: number
  drawRunnerId?: number
  homeRunnerName?: string
  awayRunnerName?: string
  confidence: number
  matchReason: string
}

export type MapperError = {
  prediction: Prediction
  reason: string
  candidates?: number
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize team names for matching
 * Removes common suffixes (FC, AFC, etc) and special characters
 */
export function normalizeTeam(name: string): string {
  if (!name) return ""
  
  return name
    .toLowerCase()
    .trim()
    // Remove common club suffixes
    .replace(/\b(fc|afc|cf|sc|fk|sk|ss|vs?|plc)\b/g, "")
    // Handle special characters and apostrophes
    .replace(/[&'`-]/g, "")
    // Remove extra whitespace and special chars
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

/**
 * Normalize market names similarly
 */
export function normalizeMarket(name: string): string {
  if (!name) return ""
  
  return name
    .toLowerCase()
    .trim()
    // Remove common market prefixes
    .replace(/^match odds\s*[-:]?\s*/i, "")
    .replace(/\bvs?\b|\bv\b|\bversus\b/g, " ")
    // Handle special characters
    .replace(/[&'`-]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

// ============================================================================
// CORE MAPPER
// ============================================================================

/**
 * Main mapper function
 * Returns best match with confidence score
 * Returns null if no suitable match found
 */
export function mapFixtureToMarket(
  prediction: Prediction,
  markets: BetfairMarket[],
  options?: {
    minConfidence?: number
    timeToleranceMinutes?: number
    requireCompetition?: boolean
  }
): MapperResult | null {
  
  const minConfidence = options?.minConfidence ?? 0.75
  const timeToleranceMs = (options?.timeToleranceMinutes ?? 90) * 60 * 1000

  // Normalize input
  const normalizedHome = normalizeTeam(prediction.home)
  const normalizedAway = normalizeTeam(prediction.away)
  const kickoff = new Date(prediction.kickoff).getTime()

  if (!normalizedHome || !normalizedAway) {
    console.warn(`[Mapper] Invalid team names: ${prediction.home} vs ${prediction.away}`)
    return null
  }

  let bestMatch: MapperResult | null = null
  let candidates = 0

  for (const market of markets) {
    // Filter: Only Match Odds markets
    if (market.marketType && market.marketType !== "MATCH_ODDS") {
      continue
    }

    candidates++

    // ⏰ TIME CHECK
    const marketTime = new Date(market.marketStartTime).getTime()
    const timeDiff = Math.abs(kickoff - marketTime)

    if (timeDiff > timeToleranceMs) {
      continue
    }

    const timeScore = 1 - (timeDiff / timeToleranceMs)

    // 🏆 COMPETITION CHECK (Optional)
    if (prediction.league && market.competition?.name) {
      const predLeague = prediction.league.toLowerCase()
      const marketLeague = market.competition.name.toLowerCase()
      
      if (!marketLeague.includes(predLeague) && !predLeague.includes(marketLeague)) {
        continue
      }
    }

    // 📝 NAME CHECK (CRITICAL)
    const marketName = normalizeMarket(market.event?.name || market.marketName || "")
    
    const homeInMarket = marketName.includes(normalizedHome)
    const awayInMarket = marketName.includes(normalizedAway)

    if (!homeInMarket || !awayInMarket) {
      continue
    }

    const nameScore = 1.0 // Both teams found = perfect match

    // 🏃 RUNNER EXTRACTION
    let homeRunnerId: number | null = null
    let homeRunnerName: string | null = null
    let awayRunnerId: number | null = null
    let awayRunnerName: string | null = null
    let drawRunnerId: number | null = null

    for (const runner of market.runners) {
      const rName = normalizeTeam(runner.runnerName)

      // Match home
      if (rName.includes(normalizedHome) && !homeRunnerId) {
        homeRunnerId = runner.selectionId
        homeRunnerName = runner.runnerName
      }

      // Match away
      if (rName.includes(normalizedAway) && !awayRunnerId) {
        awayRunnerId = runner.selectionId
        awayRunnerName = runner.runnerName
      }

      // Match draw
      if (rName === "draw" || rName === "thedraw") {
        drawRunnerId = runner.selectionId
      }
    }

    if (!homeRunnerId || !awayRunnerId) {
      continue
    }

    // 🎯 CONFIDENCE SCORING
    // Name matching = 70% importance
    // Time matching = 30% importance
    const confidence = (nameScore * 0.7) + (timeScore * 0.3)

    const result: MapperResult = {
      marketId: market.marketId,
      homeRunnerId,
      awayRunnerId,
      drawRunnerId: drawRunnerId || undefined,
      homeRunnerName: homeRunnerName || undefined,
      awayRunnerName: awayRunnerName || undefined,
      confidence,
      matchReason: `Time: ${Math.round(timeDiff / 1000 / 60)}min diff, Score: ${(confidence * 100).toFixed(0)}%`
    }

    // Keep best match
    if (!bestMatch || result.confidence > bestMatch.confidence) {
      bestMatch = result
    }
  }

  // ⛔ MINIMUM CONFIDENCE THRESHOLD
  if (bestMatch && bestMatch.confidence >= minConfidence) {
    return bestMatch
  }

  return null
}

// ============================================================================
// BATCH MAPPER (for multiple predictions)
// ============================================================================

export type MapperBatchResult = {
  matched: MapperResult[]
  unmatched: MapperError[]
  summary: {
    total: number
    matched: number
    matchRate: number
  }
}

export function mapFixturesToMarkets(
  predictions: Prediction[],
  markets: BetfairMarket[],
  options?: {
    minConfidence?: number
    timeToleranceMinutes?: number
  }
): MapperBatchResult {
  
  const matched: MapperResult[] = []
  const unmatched: MapperError[] = []

  for (const pred of predictions) {
    const result = mapFixtureToMarket(pred, markets, options)
    
    if (result) {
      matched.push(result)
    } else {
      unmatched.push({
        prediction: pred,
        reason: "No market match above confidence threshold"
      })
    }
  }

  return {
    matched,
    unmatched,
    summary: {
      total: predictions.length,
      matched: matched.length,
      matchRate: predictions.length > 0 
        ? parseFloat((matched.length / predictions.length * 100).toFixed(2))
        : 0
    }
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Log mapping results for debugging
 */
export function logMapperResults(result: MapperBatchResult): void {
  console.log("\n📊 MAPPER RESULTS")
  console.log("═".repeat(60))
  console.log(`Total: ${result.summary.total}`)
  console.log(`✅ Matched: ${result.summary.matched}`)
  console.log(`❌ Unmatched: ${result.unmatched.length}`)
  console.log(`📈 Match Rate: ${result.summary.matchRate}%`)
  
  if (result.unmatched.length > 0) {
    console.log("\n⚠️  UNMATCHED PREDICTIONS:")
    for (const err of result.unmatched.slice(0, 5)) {
      console.log(`  ${err.prediction.home} vs ${err.prediction.away} (${err.reason})`)
    }
    if (result.unmatched.length > 5) {
      console.log(`  ... and ${result.unmatched.length - 5} more`)
    }
  }
  console.log("═".repeat(60) + "\n")
}

/**
 * Export mapped predictions to format ready for /api/generate
 */
export function toGeneratePayload(
  prediction: Prediction,
  mapperResult: MapperResult,
  modelData: {
    modelProbability: number
    oddsTaken: number
    timestamp?: string
  }
) {
  return {
    fixture_id: prediction.fixture_id || mapperResult.marketId,
    home: prediction.home,
    away: prediction.away,
    market: "Match Odds",
    modelProbability: modelData.modelProbability,
    oddsTaken: modelData.oddsTaken,
    timestamp: modelData.timestamp || new Date().toISOString(),
    kickoff: prediction.kickoff,
    betfair: {
      marketId: mapperResult.marketId,
      homeRunnerId: mapperResult.homeRunnerId,
      awayRunnerId: mapperResult.awayRunnerId,
      confidence: mapperResult.confidence
    }
  }
}

// ============================================================================
// EXAMPLE USAGE (Commented Out)
// ============================================================================

/*

// Single prediction mapping
const prediction: Prediction = {
  home: "Arsenal",
  away: "Chelsea",
  kickoff: "2026-04-05T15:00:00Z",
  league: "Premier League"
}

const markets: BetfairMarket[] = [
  // ... from Betfair API
]

const result = mapFixtureToMarket(prediction, markets, {
  minConfidence: 0.75,
  timeToleranceMinutes: 90
})

if (result) {
  console.log(`✅ Matched: ${result.homeRunnerName} vs ${result.awayRunnerName}`)
  console.log(`   Market: ${result.marketId}`)
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`)
}

// Batch mapping
const predictions: Prediction[] = [...]
const batchResult = mapFixturesToMarkets(predictions, markets)
logMapperResults(batchResult)

*/
