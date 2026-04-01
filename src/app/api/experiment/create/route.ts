import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Create new experiment with bankroll initialization
 * POST /api/experiment/create
 * 
 * Body:
 * {
 *   "name": "EPL_2026_V1",
 *   "competition": "EPL",
 *   "startingBalance": 1000
 * }
 */

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const { name, competition, startingBalance = 1000 } = body

    if (!name || !competition) {
      return NextResponse.json(
        { error: 'name and competition required' },
        { status: 400 }
      )
    }

    // Close any active experiments in same competition
    const { error: closeError } = await supabase
      .from('experiments')
      .update({ status: 'complete', endDate: new Date().toISOString() })
      .eq('competition', competition)
      .eq('status', 'active')

    if (closeError) console.warn('[EXPERIMENT] Warning closing existing:', closeError.message)

    // Create new experiment
    const { data: experiment, error: expError } = await supabase
      .from('experiments')
      .insert({
        name,
        sport: 'football',
        competition,
        status: 'active',
        startDate: new Date().toISOString()
      })
      .select()
      .single()

    if (expError) throw expError

    // Initialize bankroll
    const { data: bankroll, error: bankrollError } = await supabase
      .from('bankroll')
      .insert({
        experimentId: experiment.id,
        startingBalance,
        currentBalance: startingBalance,
        peakBalance: startingBalance
      })
      .select()
      .single()

    if (bankrollError) throw bankrollError

    console.log(`[EXPERIMENT] Created: ${name} with $${startingBalance} bankroll`)

    return NextResponse.json({
      success: true,
      experiment,
      bankroll
    })
  } catch (error) {
    console.error('[EXPERIMENT] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * Get current experiment status
 * GET /api/experiment/status?competition=EPL
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const competition = searchParams.get('competition')

    if (!competition) {
      return NextResponse.json(
        { error: 'competition required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('experiments')
      .select('*, bankroll(*), bets(count)')
      .eq('competition', competition)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!data) {
      return NextResponse.json({
        success: true,
        active: false,
        competition
      })
    }

    const { data: bets } = await supabase
      .from('bets')
      .select('*', { count: 'exact' })
      .eq('experimentId', data.id)
      .eq('isShadow', false)

    return NextResponse.json({
      success: true,
      active: true,
      experiment: data,
      betCount: bets?.[0]?.count || 0
    })
  } catch (error) {
    console.error('[EXPERIMENT] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
