/**
 * Value Bet Scanner
 *
 * Replicates the RebelBetting approach:
 * 1. Collect odds from multiple bookmakers via Odds API
 * 2. Use Pinnacle (sharpest book) as the "true probability" reference
 * 3. Remove Pinnacle's vig to get fair probability
 * 4. Flag any soft bookmaker price where (fair_prob × soft_odds) > 1
 *    i.e. the soft book is offering MORE than the true probability implies
 *
 * A value bet = sportsbook odds > fair/true odds
 * EV = fair_prob × profit_if_win − fair_loss_prob × stake
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

// Pinnacle is the sharp reference — closest to true market price
const SHARP_REFS   = ['pinnacle', 'betfair_ex_uk', 'matchbook']

// Soft books where value bets can be found
const SOFT_BOOKS   = [
  'bet365', 'unibet', 'williamhill', 'ladbrokes', 'skybet',
  'betway', 'paddypower', 'coral', 'betsson', 'bwin',
  'nordicbet', 'draftkings', 'fanduel', 'betmgm',
]

export type ValueBet = {
  fixtureId:    string
  homeTeam:     string
  awayTeam:     string
  kickoff:      string
  league:       string

  outcome:      string        // "home" | "draw" | "away"
  outcomeName:  string        // e.g. "Arsenal to win"

  softBook:     string        // which book has the value
  softBookLabel:string
  softOdds:     number        // the value price at soft book

  sharpBook:    string        // the reference (Pinnacle)
  sharpOdds:    number        // Pinnacle's price for same outcome
  sharpOddsOpp: number        // Pinnacle's price for other side (for vig removal)

  fairProb:     number        // no-vig true probability
  impliedProb:  number        // implied by soft book odds
  edge:         number        // fairProb - impliedProb (positive = value)
  ev:           number        // EV on £100 stake

  yield:        number        // EV as % of stake
  confidence:   'HIGH' | 'MEDIUM' | 'LOW'
}

export type ValueScanResult = {
  valueBets: ValueBet[]
  scannedFixtures: number
  scannedOutcomes: number
  timestamp: string
}

/**
 * Remove vig from a two-sided market using Pinnacle's odds.
 * For 3-way (home/draw/away), we use the full market normalisation.
 */
function noVigProb3Way(home: number, draw: number, away: number): { home: number; draw: number; away: number; vig: number } {
  const total = 1/home + 1/draw + 1/away
  return {
    home: (1/home) / total,
    draw: (1/draw) / total,
    away: (1/away) / total,
    vig: (total - 1) * 100,
  }
}

/**
 * Scan a single league for value bets.
 */
export async function scanLeagueForValue(
  leagueKey: string,
  leagueName: string,
  minEdge: number = 0.02   // minimum edge to report (2%)
): Promise<{ bets: ValueBet[]; fixtures: number; outcomes: number }> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return { bets: [], fixtures: 0, outcomes: 0 }

  try {
    // Fetch ALL bookmakers in one call
    const allBooks = [...SHARP_REFS, ...SOFT_BOOKS].join(',')
    const url = `${ODDS_API_BASE}/sports/${leagueKey}/odds?apiKey=${apiKey}&regions=uk,eu,us&markets=h2h&dateFormat=iso&oddsFormat=decimal&bookmakers=${allBooks}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return { bets: [], fixtures: 0, outcomes: 0 }

    const events = await res.json()
    if (!Array.isArray(events)) return { bets: [], fixtures: 0, outcomes: 0 }

    const bets: ValueBet[] = []
    let outcomes = 0

    for (const event of events) {
      // Find Pinnacle (or best sharp reference) for this event
      let sharpEntry: any = null
      let sharpBookKey = ''
      for (const ref of SHARP_REFS) {
        sharpEntry = event.bookmakers?.find((b: any) => b.key === ref)
        if (sharpEntry) { sharpBookKey = ref; break }
      }
      if (!sharpEntry) continue  // No sharp reference, skip

      const sharpH2h = sharpEntry.markets?.find((m: any) => m.key === 'h2h')
      if (!sharpH2h) continue

      const sharpHome = sharpH2h.outcomes.find((o: any) => o.name === event.home_team)?.price
      const sharpAway = sharpH2h.outcomes.find((o: any) => o.name === event.away_team)?.price
      const sharpDraw = sharpH2h.outcomes.find((o: any) => o.name === 'Draw')?.price

      if (!sharpHome || !sharpAway) continue

      // Calculate no-vig fair probabilities from Pinnacle
      const fairProbs = sharpDraw
        ? noVigProb3Way(sharpHome, sharpDraw, sharpAway)
        : { home: 1/sharpHome / (1/sharpHome + 1/sharpAway), draw: 0, away: 1/sharpAway / (1/sharpHome + 1/sharpAway), vig: 0 }

      // Scan each soft bookmaker
      for (const bm of (event.bookmakers || [])) {
        if (SHARP_REFS.includes(bm.key)) continue  // skip sharp refs

        const h2h = bm.markets?.find((m: any) => m.key === 'h2h')
        if (!h2h) continue

        const softHome = h2h.outcomes.find((o: any) => o.name === event.home_team)?.price
        const softAway = h2h.outcomes.find((o: any) => o.name === event.away_team)?.price
        const softDraw = h2h.outcomes.find((o: any) => o.name === 'Draw')?.price

        const markets: Array<{ key: string; name: string; softOdds: number; sharpOdds: number; fairProb: number }> = []

        if (softHome && sharpHome) markets.push({ key: 'home', name: `${event.home_team} to win`, softOdds: softHome, sharpOdds: sharpHome, fairProb: fairProbs.home })
        if (softAway && sharpAway) markets.push({ key: 'away', name: `${event.away_team} to win`, softOdds: softAway, sharpOdds: sharpAway, fairProb: fairProbs.away })
        if (softDraw && sharpDraw && fairProbs.draw > 0) markets.push({ key: 'draw', name: 'Draw', softOdds: softDraw, sharpOdds: sharpDraw, fairProb: fairProbs.draw })

        outcomes += markets.length

        for (const m of markets) {
          const impliedProb = 1 / m.softOdds
          const edge        = m.fairProb - impliedProb

          if (edge < minEdge) continue  // not enough value

          const ev    = m.fairProb * (100 * (m.softOdds - 1)) - (1 - m.fairProb) * 100
          const yield_ = ev  // EV on £100 stake = yield %

          const confidence: ValueBet['confidence'] =
            edge >= 0.06 ? 'HIGH' :
            edge >= 0.04 ? 'MEDIUM' : 'LOW'

          bets.push({
            fixtureId:     event.id,
            homeTeam:      event.home_team,
            awayTeam:      event.away_team,
            kickoff:       event.commence_time,
            league:        leagueName,
            outcome:       m.key,
            outcomeName:   m.name,
            softBook:      bm.key,
            softBookLabel: formatBook(bm.key),
            softOdds:      m.softOdds,
            sharpBook:     sharpBookKey,
            sharpOdds:     m.sharpOdds,
            sharpOddsOpp:  m.key === 'home' ? (sharpAway || 0) : (sharpHome || 0),
            fairProb:      parseFloat(m.fairProb.toFixed(4)),
            impliedProb:   parseFloat(impliedProb.toFixed(4)),
            edge:          parseFloat((edge * 100).toFixed(2)),
            ev:            parseFloat(ev.toFixed(2)),
            yield:         parseFloat(yield_.toFixed(2)),
            confidence,
          })
        }
      }
    }

    // Sort by edge descending
    bets.sort((a, b) => b.edge - a.edge)

    return { bets, fixtures: events.length, outcomes }
  } catch {
    return { bets: [], fixtures: 0, outcomes: 0 }
  }
}

function formatBook(key: string): string {
  const map: Record<string, string> = {
    bet365: 'Bet365', unibet: 'Unibet', williamhill: 'William Hill',
    ladbrokes: 'Ladbrokes', skybet: 'Sky Bet', betway: 'Betway',
    paddypower: 'Paddy Power', coral: 'Coral', betsson: 'Betsson',
    bwin: 'bwin', nordicbet: 'NordicBet', draftkings: 'DraftKings',
    fanduel: 'FanDuel', betmgm: 'BetMGM',
  }
  return map[key] || key
}
