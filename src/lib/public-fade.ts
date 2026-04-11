/**
 * Public Fade / Reverse Line Movement Detector
 *
 * "Betting against the public" — when the public heavily backs a team
 * but the line moves AGAINST them, it signals sharp money on the other side.
 *
 * Reverse Line Movement (RLM):
 *   Public: 70% on Team A → expect odds on A to shorten
 *   Actual: odds on A LENGTHEN → sharp money is on Team B
 *   Signal: fade Team A, back Team B
 *
 * We approximate public betting % from:
 * 1. Odds movement direction (line moves against popular side = RLM)
 * 2. Volume disparity between bookmakers (soft books = public, sharp books = pros)
 * 3. Steam moves from our sharp-money-detector
 */

export type PublicFadeSignal = {
  fixtureId:    string
  homeTeam:     string
  awayTeam:     string
  kickoff:      string
  league:       string

  // Which side the public is on
  publicSide:   'home' | 'away' | 'draw'
  // Which side sharp money appears to favour
  sharpSide:    'home' | 'away' | 'draw'

  publicOdds:   number  // current odds on the public's pick (inflated by public money)
  sharpOdds:    number  // current odds on the sharp side

  // How much the line has moved against the public (% change)
  lineMovement: number

  confidence:   'LOW' | 'MEDIUM' | 'HIGH'
  signal:       string  // human-readable explanation
}

export type OddsSnapshot = {
  home: number
  draw: number
  away: number
  timestamp: string
}

const snapshotCache = new Map<string, OddsSnapshot[]>()

/**
 * Record a snapshot of odds for a fixture (call on each poll).
 * Keeps last 10 snapshots per fixture to detect movement direction.
 */
export function recordOddsSnapshot(
  fixtureId: string,
  odds: { home: number; draw: number; away: number }
): void {
  const history = snapshotCache.get(fixtureId) || []
  history.push({ ...odds, timestamp: new Date().toISOString() })
  // Keep last 10 snapshots
  if (history.length > 10) history.shift()
  snapshotCache.set(fixtureId, history)
}

/**
 * Detect reverse line movement for a fixture.
 * Returns a signal if sharp vs. public divergence is detected.
 */
export function detectPublicFade(
  fixtureId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  league: string,
  currentOdds: { home: number; draw: number; away: number },
  // Sharp book odds vs soft book odds — divergence reveals where money is going
  sharpOdds?: { home: number; draw: number; away: number },
): PublicFadeSignal | null {
  const history = snapshotCache.get(fixtureId)
  if (!history || history.length < 3) return null

  const opening = history[0]
  const current = currentOdds

  // Calculate line movements (positive = odds lengthened = public backing this side)
  const homeMove = (current.home - opening.home) / opening.home
  const drawMove = (current.draw - opening.draw) / opening.draw
  const awayMove = (current.away - opening.away) / opening.away

  // Public tends to back home teams and favourites — their money shortens those odds
  // If odds LENGTHENED despite presumed public backing → sharp money on the other side

  // Find which outcome moved most (most public action shortens those odds)
  const moves = [
    { side: 'home' as const, move: homeMove, odds: current.home },
    { draw: 'draw' as const, move: drawMove, odds: current.draw },
    { side: 'away' as const, move: awayMove, odds: current.away },
  ]

  // RLM: the most popular side (home or short-odds favourite) has lengthening odds
  // Identify likely public side (home team or lowest odds)
  const likelyPublicSide = current.home < current.away ? 'home' : 'away'
  const publicSideMove   = likelyPublicSide === 'home' ? homeMove : awayMove
  const sharpSide        = likelyPublicSide === 'home' ? 'away' : 'home'
  const sharpSideMove    = likelyPublicSide === 'home' ? awayMove : homeMove

  // Need clear reverse movement: public side odds going UP (lengthening)
  // while sharp side odds going DOWN (shortening)
  const isRLM = publicSideMove > 0.02 && sharpSideMove < -0.01
  if (!isRLM) return null

  // Confidence based on magnitude of movement
  const moveMagnitude = Math.abs(publicSideMove) + Math.abs(sharpSideMove)
  const confidence: 'LOW' | 'MEDIUM' | 'HIGH' =
    moveMagnitude > 0.08 ? 'HIGH' :
    moveMagnitude > 0.04 ? 'MEDIUM' : 'LOW'

  // If we have sharp book reference, check if sharp book disagrees with soft books
  let sharpDivergence = ''
  if (sharpOdds) {
    const softFavourite = likelyPublicSide === 'home' ? current.home : current.away
    const sharpFavourite = likelyPublicSide === 'home' ? sharpOdds.home : sharpOdds.away
    if (sharpFavourite > softFavourite * 1.03) {
      sharpDivergence = ` Pinnacle prices ${likelyPublicSide} at ${sharpFavourite.toFixed(2)} vs soft book ${softFavourite.toFixed(2)} — sharp money disagrees.`
    }
  }

  const publicOdds = likelyPublicSide === 'home' ? current.home : current.away
  const sharpSideOdds = likelyPublicSide === 'home' ? current.away : current.home

  return {
    fixtureId,
    homeTeam,
    awayTeam,
    kickoff,
    league,
    publicSide: likelyPublicSide,
    sharpSide,
    publicOdds,
    sharpOdds: sharpSideOdds,
    lineMovement: parseFloat((publicSideMove * 100).toFixed(2)),
    confidence,
    signal: `RLM: ${likelyPublicSide === 'home' ? homeTeam : awayTeam} opened as public favourite but odds have drifted ${(publicSideMove * 100).toFixed(1)}% — sharp money appears on ${sharpSide === 'home' ? homeTeam : awayTeam} @ ${sharpSideOdds.toFixed(2)}.${sharpDivergence}`,
  }
}

/**
 * Approximate public betting percentage from bookmaker margin difference.
 *
 * Sharp books (Pinnacle) price close to true probability.
 * Soft books shade odds towards popular outcomes to manage liability.
 * Difference between soft book implied prob and sharp book implied prob
 * reflects where public money has moved the line.
 */
export function estimatePublicPct(
  softOdds: number,   // soft bookmaker odds for an outcome
  sharpOdds: number,  // Pinnacle odds for same outcome
): number {
  if (!softOdds || !sharpOdds) return 50
  const softImplied  = (1 / softOdds) * 100
  const sharpImplied = (1 / sharpOdds) * 100
  // Public action reduces odds (inflates implied prob) on the popular side
  const diff = softImplied - sharpImplied
  // Rough heuristic: each 1% inflation = ~10% more public action than baseline 50%
  return Math.max(30, Math.min(80, 50 + diff * 10))
}
