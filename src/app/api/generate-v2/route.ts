import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStake } from '@/lib/staking'
import { calculateMatchOdds, type TeamStats } from '@/lib/models/poisson-v2'
import { canPlaceBet } from '@/lib/risk'
import { extractWeightedOdds, type Bookmaker } from '@/lib/odds/weighted-sharp-v2'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * /api/generate-v2
 * 
 * V2 MODEL SYSTEM (parallel to v1)
 * 
 * Upgrades:
 * 1. Adjusted Poisson: team strength + home advantage
 * 2. Weighted odds: sharp consensus instead of simple average
 * 3. Edge filter: minimum 3% edge required
 * 
 * Same input format as v1, same output format
 * Tags predictions as v2 for A/B testing
 */

type GenerateV2Input = {
  fixture_id: string
  home: string
  away: string
  market: string
  // Team stats for adjusted Poisson (optional)
  homeAttack?: number
  homeDefense?: number
  awayAttack?: number
  awayDefense?: number
  // Odds from multiple books (optional - for weighted extraction)
  bookmakers?: Bookmaker[]
  timestamp: string
  kickoff: string
}

// Edge filter: only bet when edge >= 3%
const MIN_EDGE_V2 = 0.03

// Fallback team stats if not provided
function getDefaultTeamStats(teamName: string): TeamStats {
  // Rough calibration based on league position
  const stats: Record<string, TeamStats> = {
    'Manchester City': { name: 'Manchester City', attack: 1.8, defense: 1.7 },
    Arsenal: { name: 'Arsenal', attack: 1.7, defense: 1.6 },
    Liverpool: { name: 'Liverpool', attack: 1.7, defense: 1.6 },
    'Manchester United': { name: 'Manchester United', attack: 1.5, defense: 1.4 },
    Chelsea: { name: 'Chelsea', attack: 1.4, defense: 1.5 },
    Tottenham: { name: 'Tottenham', attack: 1.6, defense: 1.5 },
    Newcastle: { name: 'Newcastle', attack: 1.4, defense: 1.6 },
    Brighton: { name: 'Brighton', attack: 1.3, defense: 1.5 },
    'Aston Villa': { name: 'Aston Villa', attack: 1.5, defense: 1.4 },
    'West Ham': { name: 'West Ham', attack: 1.2, defense: 1.3 },
  }

  return (
    stats[teamName] || {
      name: teamName,
      attack: 1.0,
      defense: 1.0,
    }
  )
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateV2Input

    const {
      fixture_id,
      home,
      away,
      market,
      homeAttack,
      homeDefense,
      awayAttack,
      awayDefense,
      bookmakers,
      timestamp,
      kickoff,
    } = body

    // Validation
    if (!fixture_id || !home || !away || !market || !timestamp || !kickoff) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse dates
    const placedDate = new Date(timestamp)
    const kickoffDate = new Date(kickoff)

    if (isNaN(placedDate.getTime()) || isNaN(kickoffDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid timestamp or kickoff date' },
        { status: 400 }
      )
    }

    // ✅ STEP 1: Get team stats (provided or defaults)
    const homeTeam: TeamStats = {
      name: home.trim(),
      attack: homeAttack || getDefaultTeamStats(home).attack,
      defense: homeDefense || getDefaultTeamStats(home).defense,
    }

    const awayTeam: TeamStats = {
      name: away.trim(),
      attack: awayAttack || getDefaultTeamStats(away).attack,
      defense: awayDefense || getDefaultTeamStats(away).defense,
    }

    // ✅ STEP 2: Calculate probabilities using adjusted Poisson
    const matchOdds = calculateMatchOdds(homeTeam, awayTeam)

    // Determine market and get relevant probability
    let modelProbability: number
    if (market.toUpperCase().includes('DRAW')) {
      modelProbability = matchOdds.drawProb
    } else if (market.toUpperCase().includes('AWAY')) {
      modelProbability = matchOdds.awayWinProb
    } else {
      // Default: home win
      modelProbability = matchOdds.homeWinProb
    }

    // ✅ STEP 3: Get odds (weighted if bookmakers provided, otherwise ask for them)
    let oddsTaken: number
    if (bookmakers && Array.isArray(bookmakers) && bookmakers.length > 0) {
      const extracted = extractWeightedOdds(bookmakers, market)
      if (!extracted) {
        return NextResponse.json(
          { error: 'Could not extract odds from provided bookmakers' },
          { status: 400 }
        )
      }
      oddsTaken = extracted
    } else {
      return NextResponse.json(
        {
          error:
            'V2 requires bookmakers array for weighted odds extraction. Provide bookmakers or use /api/generate for v1',
        },
        { status: 400 }
      )
    }

    // ✅ STEP 4: Calculate edge using model probability vs market odds
    const edgeValue = modelProbability * oddsTaken - 1

    // V2 requires minimum 3% edge (stricter than v1)
    if (edgeValue < MIN_EDGE_V2) {
      return NextResponse.json({
        skipped: true,
        reason: `Edge ${(edgeValue * 100).toFixed(2)}% below minimum ${(MIN_EDGE_V2 * 100).toFixed(1)}% for v2`,
        edge: parseFloat((edgeValue * 100).toFixed(2)),
      })
    }

    // ✅ STEP 5: Risk check (ensure we're not over-exposing)
    const openBets = await supabase
      .from('predictions')
      .select('stake')
      .eq('settled', false)
      .eq('system_version', 'v2')
      .then((res) => res.data || [])

    const openExposure = openBets.reduce(
      (sum: number, bet: any) => sum + (bet.stake || 0),
      0
    )

    // Get current bankroll
    const bankrollRes = await supabase
      .from('bankroll_state')
      .select('bankroll')
      .eq('id', 1)
      .single()

    const currentBankroll = bankrollRes.data?.bankroll || 1000

    const stake = getStake(modelProbability, oddsTaken)
    const riskCheck = canPlaceBet({
      bankroll: currentBankroll,
      proposedStake: stake,
      openExposure,
    })

    if (!riskCheck.allowed) {
      return NextResponse.json({
        skipped: true,
        reason: `Risk limit: ${riskCheck.reason}`,
        maxAllowedStake: riskCheck.maxAllowedStake,
      })
    }

    // ✅ STEP 6: Insert into database with V2 tags
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        match_id: fixture_id.trim(),
        home_team: home.trim(),
        away_team: away.trim(),
        market: market.trim(),
        model_probability: modelProbability,
        odds_taken: oddsTaken,
        implied_probability: 1 / oddsTaken,
        edge: parseFloat(edgeValue.toFixed(4)),
        stake,
        placed_at: placedDate.toISOString(),
        kickoff_at: kickoffDate.toISOString(),
        event_start: kickoffDate.toISOString(),
        result: null,
        closing_odds: null,
        settled_at: null,
        clv: null,
        settled: false,
        // V2 TAGS
        model_version: 'poisson_adj_v2',
        odds_version: 'weighted_sharp_v2',
        staking_version: 'kelly_0.25_v1',
        system_version: 'v2',
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: `DB Error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      system: 'v2',
      prediction: {
        id: data?.[0]?.id,
        event: `${home} vs ${away}`,
        market,
        edge: parseFloat(edgeValue.toFixed(4)),
        modelProbability: parseFloat((modelProbability * 100).toFixed(2)),
        impliedProbability: parseFloat(((1 / oddsTaken) * 100).toFixed(2)),
        oddsTaken,
        stake,
        homeXG: parseFloat(matchOdds.homeXG.toFixed(2)),
        awayXG: parseFloat(matchOdds.awayXG.toFixed(2)),
        kickoff,
      },
    })
  } catch (err) {
    console.error('Generate V2 error:', err)
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
