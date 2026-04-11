import { createClient } from '@supabase/supabase-js'
import { fetchEPLResults } from './fetch-results'
import { calculateRatings } from './calculate-ratings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function syncTeamRatings() {
  console.log('Fetching EPL results...')
  const results = await fetchEPLResults(2) // Last 2 seasons
  console.log(`${results.length} matches loaded`)

  const ratings = calculateRatings(results)
  console.log(`Calculated ratings for ${ratings.length} teams`)

  // Upsert into Supabase
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
