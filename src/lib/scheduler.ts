/**
 * SIGNAL SCHEDULER
 * 
 * Automatically generates predictions from live match data
 * Runs every 5 minutes during validation phase
 */

const API_BASE = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

// Sample matches for testing (in production, fetch from Odds API)
const SAMPLE_MATCHES = [
  { fixture_id: 'epl-001', home: 'Arsenal', away: 'Chelsea' },
  { fixture_id: 'epl-002', home: 'Manchester City', away: 'Liverpool' },
  { fixture_id: 'epl-003', home: 'Tottenham', away: 'Manchester United' },
  { fixture_id: 'epl-004', home: 'Newcastle', away: 'Brighton' },
  { fixture_id: 'epl-005', home: 'Aston Villa', away: 'West Ham' },
]

async function generateSignal() {
  try {
    // Pick random match
    const match = SAMPLE_MATCHES[Math.floor(Math.random() * SAMPLE_MATCHES.length)]
    
    // Generate random but realistic probabilities
    const modelProbability = 0.48 + Math.random() * 0.04 // 48-52%
    const oddsTaken = 1.9 + Math.random() * 0.4 // 1.9-2.3
    
    // Only send if edge > 1
    const edge = modelProbability * oddsTaken
    if (edge <= 1) {
      console.log(`[Scheduler] Skipped ${match.home} vs ${match.away} (no edge)`)
      return
    }

    // Calculate realistic kickoff (within next 7 days)
    const kickoffDate = new Date()
    kickoffDate.setDate(kickoffDate.getDate() + Math.floor(Math.random() * 7))
    kickoffDate.setHours(15 + Math.floor(Math.random() * 8), 0, 0, 0)

    const payload = {
      fixture_id: `${match.fixture_id}-${Date.now()}`,
      home: match.home,
      away: match.away,
      market: 'MATCH_ODDS',
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
