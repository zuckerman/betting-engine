/**
 * Odds V2: Weighted Sharp Consensus
 * 
 * Instead of simple average, weight by bookmaker reliability:
 * - Pinnacle: 1.0 (most sharp)
 * - Matchbook: 0.9
 * - Betfair: 0.95 (exchange, highly competitive)
 * - Bet365: 0.6 (slower to move)
 * - WilliamHill: 0.5 (retail)
 */

export interface BookmakerWeights {
  [key: string]: number
}

export const SHARP_WEIGHTS: BookmakerWeights = {
  // Tier 1 - Sharpest
  pinnacle: 1.0,
  matchbook: 0.95,
  'betfair:ex': 0.95,

  // Tier 2 - Good
  'betfair:sp': 0.85,
  maxbet: 0.9,
  unibet: 0.8,

  // Tier 3 - Retail
  bet365: 0.6,
  williamhill: 0.5,
  betfair_sport: 0.5,
  '888sport': 0.5,
}

export interface Bookmaker {
  key: string
  title: string
  markets: Array<{
    outcomes: Array<{
      name: string
      price: number
    }>
  }>
}

/**
 * Extract weighted odds from multiple bookmakers
 * Heavily weights sharp books, reduces noise from retail
 */
export function extractWeightedOdds(
  bookmakers: Bookmaker[],
  selection: string
): number | null {
  let totalWeight = 0
  let weightedSum = 0
  const prices: Array<{ book: string; price: number; weight: number }> = []

  for (const book of bookmakers) {
    const weight = SHARP_WEIGHTS[book.key] || 0.3

    if (!book.markets || book.markets.length === 0) continue

    const outcome = book.markets[0].outcomes?.find(
      (o: any) => o.name === selection
    )

    if (!outcome || !outcome.price) continue

    weightedSum += outcome.price * weight
    totalWeight += weight
    prices.push({ book: book.title, price: outcome.price, weight })
  }

  if (totalWeight === 0) return null

  const weighted = weightedSum / totalWeight

  return parseFloat(weighted.toFixed(3))
}

/**
 * Extract BEST (sharpest) odds
 * 
 * This is sometimes better than average because market inefficiency
 * often shows up in the best available price before it corrects
 */
export function extractBestSharpOdds(
  bookmakers: Bookmaker[],
  selection: string
): { price: number; book: string } | null {
  let bestPrice = 0
  let bestBook = ''

  for (const book of bookmakers) {
    const weight = SHARP_WEIGHTS[book.key] || 0.3

    // Skip retail books when looking for best sharp
    if (weight < 0.6) continue

    if (!book.markets || book.markets.length === 0) continue

    const outcome = book.markets[0].outcomes?.find(
      (o: any) => o.name === selection
    )

    if (!outcome || !outcome.price) continue

    if (outcome.price > bestPrice) {
      bestPrice = outcome.price
      bestBook = book.title
    }
  }

  if (bestPrice === 0) return null

  return {
    price: parseFloat(bestPrice.toFixed(3)),
    book: bestBook,
  }
}

/**
 * Calculate implied probability from odds
 */
export function impliedProbabilityFromOdds(odds: number): number {
  return 1 / odds
}

/**
 * Debug helper showing odds extraction
 */
export function getOddsDebug(
  bookmakers: Bookmaker[],
  selection: string
) {
  const weighted = extractWeightedOdds(bookmakers, selection)
  const best = extractBestSharpOdds(bookmakers, selection)

  // Show top 5 sharps
  const sharps = []
  for (const book of bookmakers) {
    const weight = SHARP_WEIGHTS[book.key]
    if (!weight || weight < 0.8) continue

    const outcome = book.markets?.[0]?.outcomes?.find(
      (o: any) => o.name === selection
    )
    if (outcome?.price) {
      sharps.push({ book: book.title, price: outcome.price, weight })
    }
  }
  sharps.sort((a, b) => b.weight - a.weight)

  return {
    selection,
    weightedOdds: weighted,
    bestOdds: best,
    topSharps: sharps.slice(0, 5),
    weightedImplied: weighted
      ? (impliedProbabilityFromOdds(weighted) * 100).toFixed(1) + '%'
      : null,
  }
}

/**
 * Check if odds meet quality threshold
 * (have good data from sharp books)
 */
export function hasQualityOdds(
  bookmakers: Bookmaker[],
  selection: string,
  minSharpCount: number = 2
): boolean {
  let sharpCount = 0

  for (const book of bookmakers) {
    const weight = SHARP_WEIGHTS[book.key]
    if (!weight || weight < 0.8) continue

    const outcome = book.markets?.[0]?.outcomes?.find(
      (o: any) => o.name === selection
    )
    if (outcome?.price) {
      sharpCount++
    }
  }

  return sharpCount >= minSharpCount
}
