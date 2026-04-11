/**
 * Sharp Money Detector
 *
 * Watches Betfair Exchange for unusual volume spikes and
 * rapid odds movement — signs that informed money (syndicates,
 * sharp bettors) is entering a market.
 *
 * Signals:
 *  - VOLUME_SPIKE   : matched volume 3x above recent baseline
 *  - ODDS_STEAM     : odds shortening rapidly (>8% in <10 min)
 *  - REVERSE_LINE   : odds move opposite to public betting direction
 *  - COMBINED       : volume spike + odds steam together (strongest)
 */

import { getMarketOdds } from './betfair-odds-service'

// ============================================================================
// TYPES
// ============================================================================

export type SharpSignalType = 'VOLUME_SPIKE' | 'ODDS_STEAM' | 'REVERSE_LINE' | 'COMBINED'

export type SharpSignal = {
  marketId: string
  selectionId: number
  selectionName: string
  home: string
  away: string
  signalType: SharpSignalType
  currentOdds: number
  previousOdds: number | null
  oddsMovePct: number        // % the odds have moved
  matchedVolume: number      // £ matched on this runner
  volumeBaselineRatio: number // current volume / baseline (e.g. 3.2 = 3.2x normal)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  detectedAt: string
  recommendation: string
}

export type MarketSnapshot = {
  marketId: string
  timestamp: number
  runners: RunnerSnapshot[]
}

export type RunnerSnapshot = {
  selectionId: number
  name: string
  backOdds: number | null
  layOdds: number | null
  lastTraded: number | null
  matchedVolume: number
}

// ============================================================================
// CONFIG
// ============================================================================

const THRESHOLDS = {
  VOLUME_SPIKE_RATIO: 3.0,    // 3x baseline = spike
  ODDS_STEAM_PCT: 0.08,       // 8% odds move = steam
  COMBINED_VOLUME_RATIO: 2.0, // Lower bar when combined with odds move
  COMBINED_ODDS_PCT: 0.05,    // Lower bar when combined with volume
  MIN_VOLUME: 500,             // Ignore markets with < £500 matched (too thin)
}

// ============================================================================
// IN-MEMORY HISTORY (replaced by DB in production)
// ============================================================================

const snapshotHistory = new Map<string, MarketSnapshot[]>()

function storeSnapshot(snapshot: MarketSnapshot) {
  const history = snapshotHistory.get(snapshot.marketId) || []
  history.push(snapshot)
  // Keep last 12 snapshots (~60 min at 5-min polling)
  if (history.length > 12) history.shift()
  snapshotHistory.set(snapshot.marketId, history)
}

function getBaseline(marketId: string, selectionId: number): number {
  const history = snapshotHistory.get(marketId) || []
  if (history.length < 3) return 0

  // Use oldest snapshots as baseline (exclude last 2 = recent activity)
  const baselineSnapshots = history.slice(0, -2)
  const volumes = baselineSnapshots
    .flatMap(s => s.runners)
    .filter(r => r.selectionId === selectionId)
    .map(r => r.matchedVolume)

  if (volumes.length === 0) return 0
  return volumes.reduce((a, b) => a + b, 0) / volumes.length
}

function getPreviousOdds(marketId: string, selectionId: number): number | null {
  const history = snapshotHistory.get(marketId) || []
  if (history.length < 2) return null

  const prev = history[history.length - 2]
  const runner = prev.runners.find(r => r.selectionId === selectionId)
  return runner?.backOdds ?? null
}

// ============================================================================
// CORE DETECTION
// ============================================================================

export function detectSharpMoney(
  current: MarketSnapshot,
  home: string,
  away: string
): SharpSignal[] {
  const signals: SharpSignal[] = []

  for (const runner of current.runners) {
    if (!runner.backOdds || runner.matchedVolume < THRESHOLDS.MIN_VOLUME) continue

    const baseline = getBaseline(current.marketId, runner.selectionId)
    const prevOdds = getPreviousOdds(current.marketId, runner.selectionId)

    const volumeRatio = baseline > 0 ? runner.matchedVolume / baseline : 0
    const oddsMove = prevOdds && runner.backOdds
      ? (prevOdds - runner.backOdds) / prevOdds  // positive = odds shortening (sharp backing)
      : 0

    const isVolumeSpike = volumeRatio >= THRESHOLDS.VOLUME_SPIKE_RATIO
    const isOddsSteam = oddsMove >= THRESHOLDS.ODDS_STEAM_PCT
    const isCombined =
      volumeRatio >= THRESHOLDS.COMBINED_VOLUME_RATIO &&
      oddsMove >= THRESHOLDS.COMBINED_ODDS_PCT

    let signalType: SharpSignalType | null = null

    if (isCombined) {
      signalType = 'COMBINED'
    } else if (isVolumeSpike) {
      signalType = 'VOLUME_SPIKE'
    } else if (isOddsSteam) {
      signalType = 'ODDS_STEAM'
    }

    if (!signalType) continue

    const confidence: SharpSignal['confidence'] =
      signalType === 'COMBINED' ? 'HIGH'
      : volumeRatio >= 5 || oddsMove >= 0.12 ? 'HIGH'
      : volumeRatio >= 3 || oddsMove >= 0.08 ? 'MEDIUM'
      : 'LOW'

    signals.push({
      marketId: current.marketId,
      selectionId: runner.selectionId,
      selectionName: runner.name,
      home,
      away,
      signalType,
      currentOdds: runner.backOdds,
      previousOdds: prevOdds,
      oddsMovePct: parseFloat((oddsMove * 100).toFixed(1)),
      matchedVolume: runner.matchedVolume,
      volumeBaselineRatio: parseFloat(volumeRatio.toFixed(1)),
      confidence,
      detectedAt: new Date().toISOString(),
      recommendation: buildRecommendation(signalType, runner.backOdds, oddsMove, volumeRatio, runner.name),
    })
  }

  return signals
}

function buildRecommendation(
  type: SharpSignalType,
  odds: number,
  oddsMove: number,
  volumeRatio: number,
  selection: string
): string {
  switch (type) {
    case 'COMBINED':
      return `Sharp money on ${selection} @ ${odds.toFixed(2)} — ${(oddsMove * 100).toFixed(0)}% odds drop + ${volumeRatio.toFixed(1)}x volume. Act before odds shorten further.`
    case 'VOLUME_SPIKE':
      return `${volumeRatio.toFixed(1)}x normal volume on ${selection} @ ${odds.toFixed(2)}. Informed money entering market.`
    case 'ODDS_STEAM':
      return `Odds steaming in on ${selection}: ${(oddsMove * 100).toFixed(0)}% move. Market being pushed by sharp action.`
    case 'REVERSE_LINE':
      return `Reverse line movement on ${selection} @ ${odds.toFixed(2)}. Sharps opposing public money.`
  }
}

// ============================================================================
// BETFAIR MARKET POLLER
// ============================================================================

export async function pollMarketForSharpMoney(
  marketId: string,
  home: string,
  away: string,
  runnerNames: Record<number, string>
): Promise<SharpSignal[]> {
  try {
    const oddsData = await getMarketOdds(marketId)

    const runners: RunnerSnapshot[] = Object.entries(oddsData).map(([id, odds]) => ({
      selectionId: parseInt(id),
      name: runnerNames[parseInt(id)] || `Runner ${id}`,
      backOdds: odds.back,
      layOdds: odds.lay,
      lastTraded: odds.lastTraded,
      matchedVolume: odds.volume || 0,
    }))

    const snapshot: MarketSnapshot = {
      marketId,
      timestamp: Date.now(),
      runners,
    }

    const signals = detectSharpMoney(snapshot, home, away)
    storeSnapshot(snapshot)

    return signals
  } catch (err) {
    console.error(`[SharpDetector] Failed to poll market ${marketId}:`, err)
    return []
  }
}
