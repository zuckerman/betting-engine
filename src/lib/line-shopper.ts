/**
 * Line Shopper
 *
 * Fetches all bookmaker prices for a fixture and finds the best available odds
 * for each outcome. The gap between best price and market average is the "line
 * shopping edge" — real money left on the table if you bet at the wrong book.
 *
 * Works with The Odds API which returns all bookmakers per event.
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

// Bookmakers ranked by sharpness (Pinnacle = sharpest, closest to true odds)
const SHARP_BOOKS  = ['pinnacle', 'betfair_ex_uk', 'matchbook', 'betsson', 'nordicbet']
const SOFT_BOOKS   = ['bet365', 'unibet', 'williamhill', 'ladbrokes', 'skybet', 'betway', 'paddypower', 'coral']
const ALL_BOOKS    = [...SHARP_BOOKS, ...SOFT_BOOKS]

export type BookmakerOdds = {
  bookmaker: string
  bookmakerLabel: string
  isSharp: boolean
  home: number
  draw: number
  away: number
  margin: number  // overround (1 = break-even, 1.05 = 5% margin)
}

export type BestPriceResult = {
  fixtureId: string
  homeTeam: string
  awayTeam: string
  kickoff: string
  league: string

  // Best available price per outcome (across all books)
  bestHome:  { odds: number; bookmaker: string }
  bestDraw:  { odds: number; bookmaker: string }
  bestAway:  { odds: number; bookmaker: string }

  // Pinnacle / sharpest book as reference (true market price)
  sharpHome: number | null
  sharpDraw: number | null
  sharpAway: number | null

  // Extra value vs. sharp consensus (%)
  // e.g. +3.2% means best available is 3.2% better than Pinnacle
  lineDiffHome: number | null
  lineDiffDraw: number | null
  lineDiffAway: number | null

  // All bookmakers for display
  books: BookmakerOdds[]

  // Is there arb across these books?
  arbMargin: number     // <0 = arb profit, >0 = no arb
  isArb: boolean
}

/**
 * Fetch all bookmaker odds for a single league and return best-price analysis.
 */
export async function getLineShopping(leagueKey: string, leagueName: string): Promise<BestPriceResult[]> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return []

  try {
    const url = `${ODDS_API_BASE}/sports/${leagueKey}/odds?apiKey=${apiKey}&regions=uk,eu&markets=h2h&dateFormat=iso&oddsFormat=decimal&bookmakers=${ALL_BOOKS.join(',')}`
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) return []

    const events = await res.json()
    if (!Array.isArray(events)) return []

    return events.map(event => parseEventOdds(event, leagueName))
  } catch {
    return []
  }
}

function parseEventOdds(event: any, leagueName: string): BestPriceResult {
  const books: BookmakerOdds[] = []
  let bestHome = { odds: 0, bookmaker: '' }
  let bestDraw = { odds: 0, bookmaker: '' }
  let bestAway = { odds: 0, bookmaker: '' }
  let sharpHome: number | null = null
  let sharpDraw: number | null = null
  let sharpAway: number | null = null

  for (const bm of (event.bookmakers || [])) {
    const h2h = bm.markets?.find((m: any) => m.key === 'h2h')
    if (!h2h) continue

    const home = h2h.outcomes.find((o: any) => o.name === event.home_team)?.price
    const away = h2h.outcomes.find((o: any) => o.name === event.away_team)?.price
    const draw = h2h.outcomes.find((o: any) => o.name === 'Draw')?.price

    if (!home || !away || !draw) continue

    const margin = (1/home + 1/draw + 1/away)
    const isSharp = SHARP_BOOKS.includes(bm.key)

    books.push({
      bookmaker: bm.key,
      bookmakerLabel: formatBookLabel(bm.key),
      isSharp,
      home,
      draw,
      away,
      margin: parseFloat(margin.toFixed(4)),
    })

    if (home > bestHome.odds) bestHome = { odds: home, bookmaker: bm.key }
    if (draw > bestDraw.odds) bestDraw = { odds: draw, bookmaker: bm.key }
    if (away > bestAway.odds) bestAway = { odds: away, bookmaker: bm.key }

    // Use sharpest book as reference (first sharp book encountered)
    if (isSharp && sharpHome === null) {
      sharpHome = home
      sharpDraw = draw
      sharpAway = away
    }
  }

  // Sort: sharp books first, then by lowest margin (most efficient)
  books.sort((a, b) => {
    if (a.isSharp !== b.isSharp) return a.isSharp ? -1 : 1
    return a.margin - b.margin
  })

  // Line shopping edge vs. sharp reference
  const lineDiffHome = sharpHome && bestHome.odds
    ? parseFloat(((bestHome.odds / sharpHome - 1) * 100).toFixed(2))
    : null
  const lineDiffDraw = sharpDraw && bestDraw.odds
    ? parseFloat(((bestDraw.odds / sharpDraw - 1) * 100).toFixed(2))
    : null
  const lineDiffAway = sharpAway && bestAway.odds
    ? parseFloat(((bestAway.odds / sharpAway - 1) * 100).toFixed(2))
    : null

  // Arb check: if sum of best implied probs < 1.0 → guaranteed profit
  const arbMargin = bestHome.odds && bestDraw.odds && bestAway.odds
    ? parseFloat(((1/bestHome.odds + 1/bestDraw.odds + 1/bestAway.odds) - 1).toFixed(4))
    : 0

  return {
    fixtureId: event.id,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    kickoff: event.commence_time,
    league: leagueName,
    bestHome,
    bestDraw,
    bestAway,
    sharpHome,
    sharpDraw,
    sharpAway,
    lineDiffHome,
    lineDiffDraw,
    lineDiffAway,
    books,
    arbMargin,
    isArb: arbMargin < -0.001,  // >0.1% profit margin = genuine arb
  }
}

function formatBookLabel(key: string): string {
  const labels: Record<string, string> = {
    pinnacle: 'Pinnacle', betfair_ex_uk: 'Betfair EX', matchbook: 'Matchbook',
    betsson: 'Betsson', nordicbet: 'NordicBet', bet365: 'Bet365',
    unibet: 'Unibet', williamhill: 'William Hill', ladbrokes: 'Ladbrokes',
    skybet: 'Sky Bet', betway: 'Betway', paddypower: 'Paddy Power', coral: 'Coral',
  }
  return labels[key] || key
}

/**
 * Calculate arbitrage stakes for guaranteed profit.
 * Given best odds for each outcome and a total stake, returns
 * how much to bet on each outcome and the guaranteed profit.
 */
export function calcArbStakes(
  homeOdds: number,
  drawOdds: number,
  awayOdds: number,
  totalStake: number = 100
): { homeStake: number; drawStake: number; awayStake: number; guaranteedProfit: number; profitPct: number } {
  const impliedSum = 1/homeOdds + 1/drawOdds + 1/awayOdds

  // Distribute stake in inverse proportion to odds (each outcome returns equal amount)
  const homeStake = parseFloat((totalStake * (1/homeOdds) / impliedSum).toFixed(2))
  const drawStake = parseFloat((totalStake * (1/drawOdds) / impliedSum).toFixed(2))
  const awayStake = parseFloat((totalStake * (1/awayOdds) / impliedSum).toFixed(2))

  // Guaranteed return regardless of outcome
  const guaranteedReturn = homeStake * homeOdds  // same for all outcomes
  const guaranteedProfit = parseFloat((guaranteedReturn - totalStake).toFixed(2))
  const profitPct = parseFloat(((guaranteedProfit / totalStake) * 100).toFixed(2))

  return { homeStake, drawStake, awayStake, guaranteedProfit, profitPct }
}
