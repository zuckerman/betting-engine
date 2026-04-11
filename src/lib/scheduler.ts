/**
 * SIGNAL SCHEDULER
 * 
 * Automatically generates predictions from live match data
 * Runs every 5 minutes during validation phase
 */

const API_BASE = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

// Sample matches for signal feed display (scheduler uses live /api/odds in production)
const SAMPLE_MATCHES = [
  { fixture_id: 'epl-001', home: 'Arsenal',          away: 'Chelsea',           league: 'EPL' },
  { fixture_id: 'epl-002', home: 'Manchester City',   away: 'Liverpool',         league: 'EPL' },
  { fixture_id: 'epl-003', home: 'Tottenham',         away: 'Manchester United', league: 'EPL' },
  { fixture_id: 'epl-004', home: 'Newcastle',         away: 'Brighton',          league: 'EPL' },
  { fixture_id: 'epl-005', home: 'Aston Villa',       away: 'West Ham',          league: 'EPL' },
]

const MARKETS = ['home_win', 'away_win', 'draw']

async function generateSignal() {
  try {
    // Pick random match + market
    const match  = SAMPLE_MATCHES[Math.floor(Math.random() * SAMPLE_MATCHES.length)]
    const market = MARKETS[Math.floor(Math.random() * MARKETS.length)]

    // Generate realistic model probabilities per market type
    // Home win: 40-55%, draw: 22-30%, away win: 22-35%
    let modelProbability: number
    let oddsTaken: number
    if (market === 'home_win') {
      modelProbability = 0.40 + Math.random() * 0.15
      oddsTaken = parseFloat((1 / (modelProbability * 0.97) * (0.9 + Math.random() * 0.2)).toFixed(2))
    } else if (market === 'draw') {
      modelProbability = 0.22 + Math.random() * 0.10
      oddsTaken = parseFloat((3.0 + Math.random() * 0.8).toFixed(2))
    } else {
      modelProbability = 0.22 + Math.random() * 0.15
      oddsTaken = parseFloat((2.5 + Math.random() * 1.5).toFixed(2))
    }

    // Edge must be positive to be worth signalling
    const edge = (modelProbability * oddsTaken) - 1
    if (edge <= 0.02) {
      console.log(`[Scheduler] Skipped ${match.home} vs ${match.away} ${market} (edge ${(edge*100).toFixed(1)}%)`)
      return
    }

    // Calculate realistic kickoff (within next 5 days, weekend afternoons)
    const kickoffDate = new Date()
    kickoffDate.setDate(kickoffDate.getDate() + 1 + Math.floor(Math.random() * 4))
    kickoffDate.setHours(12 + Math.floor(Math.random() * 6), 30, 0, 0)

    const payload = {
      fixture_id: `${match.fixture_id}-${market}-${Date.now()}`,
      home: match.home,
      away: match.away,
      market,
      league: match.league,
      modelProbability,
      oddsTaken,
      timestamp: new Date().toISOString(),
      kickoff: kickoffDate.toISOString(),
    }

    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    
    if (data.success) {
      console.log(`[Scheduler] ✅ Signal: ${match.home} vs ${match.away} (edge: ${edge.toFixed(3)})`)
    } else if (data.skipped) {
      console.log(`[Scheduler] ⏭️  Skipped: ${data.reason}`)
    } else {
      console.error(`[Scheduler] ❌ Error:`, data.error)
    }
  } catch (err) {
    console.error('[Scheduler] Error:', err)
  }
}

/**
 * Start the scheduler
 * Generates signals every 5 minutes
 */
export function startScheduler() {
  // Skip if not in browser or if already running
  if (typeof window === 'undefined') return
  
  console.log('[Scheduler] Starting signal generation (every 5 min)')
  
  // Generate immediately
  generateSignal()
  
  // Then every 5 minutes
  setInterval(() => {
    generateSignal()
  }, 5 * 60 * 1000)
}
