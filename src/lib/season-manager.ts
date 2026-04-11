/**
 * Season Manager
 *
 * Handles:
 * 1. Off-season detection — when primary leagues go quiet, expand coverage
 * 2. Season transition detection — new season = calibration window
 * 3. League schedule awareness — knows which competitions run when
 * 4. Model staleness warnings — flags when training data is getting old
 */

// ============================================================================
// LEAGUE CATALOGUE — year-round coverage
// ============================================================================

export type LeagueEntry = {
  key: string          // Odds API sport key
  name: string
  tier: 'primary' | 'secondary' | 'fill'
  // Months active (1=Jan, 12=Dec). null = year-round
  activeMonths: number[] | null
  region: 'europe' | 'americas' | 'global'
}

export const ALL_LEAGUES: LeagueEntry[] = [
  // ── Primary European (Aug–May) ────────────────────────────────────────────
  { key: 'soccer_epl',                    name: 'EPL',           tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },
  { key: 'soccer_england_championship',   name: 'Championship',  tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },
  { key: 'soccer_spain_la_liga',          name: 'LaLiga',        tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },
  { key: 'soccer_germany_bundesliga',     name: 'Bundesliga',    tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },
  { key: 'soccer_italy_serie_a',          name: 'SerieA',        tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },
  { key: 'soccer_france_ligue_one',       name: 'Ligue1',        tier: 'primary',   activeMonths: [8,9,10,11,12,1,2,3,4,5], region: 'europe' },

  // ── European Cups (Sept–May) ──────────────────────────────────────────────
  { key: 'soccer_uefa_champs_league',     name: 'UCL',           tier: 'secondary', activeMonths: [9,10,11,12,1,2,3,4,5],   region: 'europe' },
  { key: 'soccer_uefa_europa_league',     name: 'UEL',           tier: 'secondary', activeMonths: [9,10,11,12,1,2,3,4,5],   region: 'europe' },

  // ── Year-round fill leagues ───────────────────────────────────────────────
  { key: 'soccer_turkey_super_league',    name: 'SüperLig',      tier: 'fill',      activeMonths: null,                      region: 'europe' },
  { key: 'soccer_greece_super_league',    name: 'GreekSL',       tier: 'fill',      activeMonths: null,                      region: 'europe' },

  // ── Summer fill (MLS: Mar–Nov, Brasileirão: Apr–Dec) ────────────────────
  { key: 'soccer_usa_mls',               name: 'MLS',           tier: 'fill',      activeMonths: [3,4,5,6,7,8,9,10,11],    region: 'americas' },
  { key: 'soccer_brazil_campeonato',      name: 'Brasileirão',   tier: 'fill',      activeMonths: [4,5,6,7,8,9,10,11,12],   region: 'americas' },
  { key: 'soccer_argentina_primera_division', name: 'ArgPrimera', tier: 'fill',     activeMonths: [2,3,4,5,6,7,8,9,10,11,12], region: 'americas' },

  // ── Scottish (Aug–May, but has summer friendlies) ─────────────────────────
  { key: 'soccer_scotland_premiership',   name: 'ScottishPrem',  tier: 'secondary', activeMonths: [7,8,9,10,11,12,1,2,3,4,5], region: 'europe' },
]

// ============================================================================
// ACTIVE LEAGUES FOR CURRENT DATE
// ============================================================================

export function getActiveLeagues(date: Date = new Date()): LeagueEntry[] {
  const month = date.getMonth() + 1 // 1-12

  return ALL_LEAGUES.filter(l =>
    l.activeMonths === null || l.activeMonths.includes(month)
  )
}

export function getPrimaryLeagues(date: Date = new Date()): LeagueEntry[] {
  return getActiveLeagues(date).filter(l => l.tier === 'primary')
}

export function isOffSeason(date: Date = new Date()): boolean {
  // Primary leagues all go quiet June–July
  return getPrimaryLeagues(date).length === 0
}

// ============================================================================
// SEASON TRANSITION DETECTION
// ============================================================================

export type SeasonPhase =
  | 'MID_SEASON'      // Normal — model runs at full confidence
  | 'END_OF_SEASON'   // Apr–May: final stretch, model reliable but sample shrinking
  | 'OFF_SEASON'      // Jun–Jul: no primary leagues, run fill leagues only
  | 'NEW_SEASON'      // Aug–Sep first 8 weeks: calibration window, reduced stakes

const NEW_SEASON_START_MONTH = 8  // August
const NEW_SEASON_CALIBRATION_WEEKS = 8

export function getSeasonPhase(date: Date = new Date()): SeasonPhase {
  const month = date.getMonth() + 1

  if (month === 6 || month === 7) return 'OFF_SEASON'
  if (month === 4 || month === 5) return 'END_OF_SEASON'

  if (month === NEW_SEASON_START_MONTH) return 'NEW_SEASON'

  // September: check if within calibration window
  if (month === 9) {
    const seasonStart = new Date(date.getFullYear(), NEW_SEASON_START_MONTH - 1, 1)
    const weeksSinceStart = (date.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    if (weeksSinceStart < NEW_SEASON_CALIBRATION_WEEKS) return 'NEW_SEASON'
  }

  return 'MID_SEASON'
}

// ============================================================================
// PHASE-BASED CONFIG OVERRIDES
// ============================================================================

export type PhaseConfig = {
  stakeMultiplier: number    // 1.0 = normal, 0.5 = half stakes
  minEdgeGate: number        // Minimum edge to generate a signal
  trainingWindow: number     // Days of history to use for training
  description: string
}

export function getPhaseConfig(date: Date = new Date()): PhaseConfig {
  const phase = getSeasonPhase(date)

  switch (phase) {
    case 'NEW_SEASON':
      return {
        stakeMultiplier: 0.5,
        minEdgeGate: 0.05,     // Tighter gate — only take high-conviction bets
        trainingWindow: 365,
        description: 'New season calibration: half stakes, high edge gate until Week 8',
      }
    case 'OFF_SEASON':
      return {
        stakeMultiplier: 0.75,
        minEdgeGate: 0.04,
        trainingWindow: 365,
        description: 'Off-season: fill leagues only, reduced exposure',
      }
    case 'END_OF_SEASON':
      return {
        stakeMultiplier: 1.0,
        minEdgeGate: 0.03,
        trainingWindow: 365,
        description: 'End of season: full stakes, model well-calibrated',
      }
    case 'MID_SEASON':
    default:
      return {
        stakeMultiplier: 1.0,
        minEdgeGate: 0.03,
        trainingWindow: 365,
        description: 'Mid-season: full operation',
      }
  }
}

// ============================================================================
// MODEL STALENESS CHECK
// ============================================================================

export type StalenessReport = {
  lastTrainedAt: string | null
  daysSinceTraining: number | null
  isStale: boolean
  warning: string | null
}

export function checkModelStaleness(lastTrainedAt: string | null): StalenessReport {
  if (!lastTrainedAt) {
    return {
      lastTrainedAt: null,
      daysSinceTraining: null,
      isStale: true,
      warning: 'Model has never been trained. Run /api/train after seeding data.',
    }
  }

  const days = (Date.now() - new Date(lastTrainedAt).getTime()) / (1000 * 60 * 60 * 24)

  return {
    lastTrainedAt,
    daysSinceTraining: Math.round(days),
    isStale: days > 14,
    warning: days > 14
      ? `Model is ${Math.round(days)} days old. Retrain to capture recent form.`
      : null,
  }
}
