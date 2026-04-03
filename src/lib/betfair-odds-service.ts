/**
 * Betfair Odds Service
 * 
 * Fetches live and closing odds from Betfair API
 * Ready to switch from mock to real with environment variables
 */

export type BetfairOdds = {
  back: number | null
  lay: number | null
  lastTraded: number | null
  volume?: number
}

export type RunnerOdds = Record<number, BetfairOdds>

// ============================================================================
// CONFIGURATION
// ============================================================================

const BETFAIR_API_URL = "https://api.betfair.com/exchange/betting/json-rpc/v1"

const APP_KEY = process.env.BETFAIR_APP_KEY
const SESSION_TOKEN = process.env.BETFAIR_SESSION_TOKEN

/**
 * Check if real Betfair credentials are configured
 */
export function isBetfairLive(): boolean {
  return !!APP_KEY && !!SESSION_TOKEN
}

// ============================================================================
// REAL BETFAIR API CALLS
// ============================================================================

/**
 * Get football markets from Betfair
 */
export async function getFootballMarkets() {
  if (!APP_KEY || !SESSION_TOKEN) {
    throw new Error("Betfair credentials not configured")
  }

  const response = await fetch(BETFAIR_API_URL, {
    method: "POST",
    headers: {
      "X-Application": APP_KEY,
      "X-Authentication": SESSION_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "SportsAPING/v1.0/listMarketCatalogue",
      params: {
        filter: {
          eventTypeIds: ["1"], // Football
          marketTypeCodes: ["MATCH_ODDS"]
        },
        maxResults: 50,
        marketProjection: ["RUNNER_DESCRIPTION", "EVENT", "COMPETITION"]
      },
      id: 1
    })
  })

  if (!response.ok) {
    throw new Error(`Betfair API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Betfair error: ${data.error.message}`)
  }

  return data.result || []
}

/**
 * Get live odds for a specific market
 */
export async function getMarketOdds(marketId: string): Promise<RunnerOdds> {
  if (!APP_KEY || !SESSION_TOKEN) {
    throw new Error("Betfair credentials not configured")
  }

  const response = await fetch(BETFAIR_API_URL, {
    method: "POST",
    headers: {
      "X-Application": APP_KEY,
      "X-Authentication": SESSION_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "SportsAPING/v1.0/listMarketBook",
      params: {
        marketIds: [marketId],
        priceProjection: {
          priceData: ["EX_BEST_OFFERS", "EX_TRADED"]
        }
      },
      id: 1
    })
  })

  if (!response.ok) {
    throw new Error(`Betfair API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Betfair error: ${data.error.message}`)
  }

  if (!data.result || data.result.length === 0) {
    return {}
  }

  const marketBook = data.result[0]
  return extractRunnerOdds(marketBook.runners)
}

/**
 * Extract odds from Betfair runner data
 */
function extractRunnerOdds(runners: any[]): RunnerOdds {
  const result: RunnerOdds = {}

  for (const runner of runners) {
    result[runner.selectionId] = {
      back: runner.ex?.availableToBack?.[0]?.price || null,
      lay: runner.ex?.availableToLay?.[0]?.price || null,
      lastTraded: runner.lastPriceTraded || null,
      volume: runner.ex?.availableToBack?.[0]?.size || 0
    }
  }

  return result
}

/**
 * Get best odds for a specific runner (used for entry odds)
 */
export async function getRunnerOdds(
  marketId: string,
  selectionId: number
): Promise<BetfairOdds | null> {
  try {
    const odds = await getMarketOdds(marketId)
    return odds[selectionId] || null
  } catch (err) {
    console.error("Error fetching runner odds:", err)
    return null
  }
}

// ============================================================================
// MOCK ODDS (for development/testing)
// ============================================================================

/**
 * Generate mock closing odds for testing
 * Simulates realistic market movement (±5-15% variance)
 */
export function generateMockClosingOdds(entryOdds: number): number {
  // Realistic market movement: ±7.5% average
  const variance = (Math.random() - 0.5) * 0.15 // ±7.5%
  const closing = entryOdds * (1 + variance)

  // Ensure reasonable bounds
  return Math.max(1.01, Math.min(closing, 1000))
}

/**
 * Use mock odds if credentials not configured
 */
export async function getClosingOddsSafe(
  marketId: string,
  selectionId: number,
  entryOdds?: number
): Promise<number> {
  try {
    if (isBetfairLive()) {
      const odds = await getMarketOdds(marketId)
      const runnerOdds = odds[selectionId]
      
      if (runnerOdds?.lastTraded) {
        return runnerOdds.lastTraded
      }
    }
  } catch (err) {
    console.warn("Betfair API failed, using mock odds:", err)
  }

  // Fall back to mock
  return generateMockClosingOdds(entryOdds || 2.0)
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get the best back price (what you can bet at)
 */
export function getBestBackOdds(odds: BetfairOdds): number | null {
  return odds.back || odds.lastTraded || odds.lay || null
}

/**
 * Get the best lay price (what market offers)
 */
export function getBestLayOdds(odds: BetfairOdds): number | null {
  return odds.lay || odds.lastTraded || odds.back || null
}

/**
 * Check if market has sufficient liquidity
 * Returns true if back price is available and volume > threshold
 */
export function hasLiquidity(odds: BetfairOdds, minVolume: number = 100): boolean {
  return (odds.back !== null) && ((odds.volume || 0) >= minVolume)
}

/**
 * Format odds for display
 */
export function formatOdds(odds: BetfairOdds): string {
  if (odds.lastTraded) {
    return odds.lastTraded.toFixed(2)
  }
  if (odds.back) {
    return odds.back.toFixed(2)
  }
  return "N/A"
}
