import { createClient } from '@supabase/supabase-js'
import { fetchEPLResults } from '@/lib/ratings/fetch-results'
import { calculateRatings } from '@/lib/ratings/calculate-ratings'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function syncTeamRatings() {
  console.log('Fetching EPL results...')
  const results = await fetchEPLResults(2)
  console.log(`${results.length} matches loaded`)

  const ratings = calculateRatings(results)
  console.log(`Calculated ratings for ${ratings.length} teams`)

  const { error } = await supabase
    .from('team_ratings')
    .upsert(
      ratings.map(r => ({
        team_name: r.team,
        attack: r.attack,
        defence: r.defence,
        home_attack: r.homeAttack,
        home_defence: r.homeDefence,
        away_attack: r.awayAttack,
        away_defence: r.awayDefence,
        games_played: r.gamesPlayed,
        goals_for: r.goalsFor,
        goals_against: r.goalsAgainst,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'team_name' }
    )

  if (error) throw error
  console.log('Ratings synced to Supabase')
  return ratings
}

export async function POST() {
  try {
    const ratings = await syncTeamRatings()
    return NextResponse.json({
      success: true,
      teamsUpdated: ratings.length,
      topAttack: ratings.slice(0, 5).map(r => ({
        team: r.team,
        attack: r.attack.toFixed(3),
        defence: r.defence.toFixed(3)
      }))
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
