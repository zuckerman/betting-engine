/**
 * The Odds API Integration
 *
 * Fetches closing odds from multiple bookmakers using The Odds API
 * Free tier available at https://the-odds-api.com
 *
 * Documentation: https://the-odds-api.com/api-usage
 */

import { BookmakerOdds } from "./weighted-clv-engine"

const API_KEY = process.env.ODDS_API_KEY
const API_BASE = "https://api.the-odds-api.com/v4"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OddsAPIMarket = {
  key: string
  title: string
  last_update: string
  outcomes: Array<{
    name: string
    price: number
  }>
}

export type OddsAPIBookmaker = {
  key: string
  title: string
  last_update: string
  markets: OddsAPIMarket[]
}

export type OddsAPIEvent = {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsAPIBookmaker[]
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export function isOddsAPIConfigured(): boolean {
  return !!API_KEY && API_KEY !== "your_odds_api_key_here"
}

/**
 * Get available bookmakers (check API limits)
 */
export async function getAvailableBookmakers(): Promise<string[]> {
  if (!isOddsAPIConfigured()) {
    return []
  }

  try {
    const response = await fetch(`${API_BASE}/sports/soccer_epl/bookmakers`, {
      headers: { "x-api-key": API_KEY },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.map((b: any) => b.key)
  } catch (err) {
    console.error("[ODDS_API] Error fetching bookmakers:", err)
    return []
  }
}

// ============================================================================
// FETCH LIVE ODDS
// ============================================================================

/**
 * Fetch live odds for football matches
 *
 * Markets: h2h (Match Winner), over_under (Total Goals), etc.
 */
export async function getLiveOdds(options: {
  sport?: string
  markets?: string
  regions?: string
  limit?: number
} = {}): Promise<OddsAPIEvent[]> {
  if (!isOddsAPIConfigured()) {
    console.warn("[ODDS_API] Not configured, using mock data")
    return []
  }

  const {
    sport = "soccer_epl",
    markets = "h2h",
    regions = "uk",
    limit = 20,
  } = options

  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      sport,
      markets,
      regions,
      limit: String(limit),
    })

    const response = await fetch(`${API_BASE}/sports/${sport}/odds?${params}`, {
      headers: { "x-api-key": API_KEY },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data || []
  } catch (err) {
    console.error("[ODDS_API] Error fetching odds:", err)
    return []
  }
}

// ============================================================================
// EXTRACT CLOSING ODDS FOR TEAM
// ============================================================================

/**
 * Extract closing odds for a specific team from API response
 */
export function extractClosingOdds(
  event: OddsAPIEvent,
  teamName: string,
  marketType: string = "h2h"
): BookmakerOdds[] {
  if (!event.bookmakers || event.bookmakers.length === 0) {
    return []
  }

  const odds: BookmakerOdds[] = []

  for (const bookmaker of event.bookmakers) {
    // Find matching market
    const market = bookmaker.markets?.find((m) => m.key === marketType)
    if (!market || !market.outcomes) continue

    // Find matching outcome (team)
    const outcome = market.outcomes.find((o) => normalizeTeamName(o.name) === normalizeTeamName(teamName))
    if (!outcome) continue

    odds.push({
      book: bookmaker.key,
      price: outcome.price,
      timestamp: bookmaker.last_update,
    })
  }

  return odds
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Normalize team names for comparison
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
}

/**
 * Check if event is close to kickoff (within 5 minutes)
 */
export function isCloseToKickoff(commenceTime: string): boolean {
  const kickoff = new Date(commenceTime).getTime()
  const now = Date.now()
  const diffMinutes = (kickoff - now) / (1000 * 60)

  return diffMinutes <= 5 && diffMinutes >= -10 // Allow 10 min after
}

/**
 * Get closing odds that are closest to kickoff
 */
export async function getClosingOddsBeforeKickoff(
  teamName: string,
  kickoffTime: string
): Promise<BookmakerOdds[]> {
  if (!isOddsAPIConfigured()) {
    return []
  }

  try {
    const events = await getLiveOdds({ limit: 1 })

    for (const event of events) {
      const kickoff = new Date(event.commence_time).getTime()
      const target = new Date(kickoffTime).getTime()

      // Match within 5 minutes
      if (Math.abs(kickoff - target) < 5 * 60 * 1000) {
        return extractClosingOdds(event, teamName, "h2h")
      }
    }

    return []
  } catch (err) {
    console.error("[ODDS_API] Error getting closing odds:", err)
    return []
  }
}

// ============================================================================
// SAFE WRAPPER
// ============================================================================

/**
 * Safely fetch closing odds with fallback
 */
export async function getClosingOddsSafe(
  teamName: string,
  kickoffTime: string
): Promise<BookmakerOdds[]> {
  try {
    if (isOddsAPIConfigured()) {
      const odds = await getClosingOddsBeforeKickoff(teamName, kickoffTime)
      if (odds.length > 0) {
        return odds
      }
    }
  } catch (err) {
    console.warn("[ODDS_API] Fallback to empty array:", err)
  }

  return []
}

export const ODDS_API = {
  isConfigured: isOddsAPIConfigured,
  getLiveOdds,
  extractClosingOdds,
  getClosingOddsBeforeKickoff,
  getClosingOddsSafe,
  getAvailableBookmakers,
}
