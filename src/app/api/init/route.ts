/**
 * Initialize Supabase tables
 * 
 * Creates odds_snapshots table if it doesn't exist
 * Run this once to set up the schema
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export async function POST() {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Initialization instructions provided',
      instruction: `
Run this SQL in your Supabase SQL editor (https://app.supabase.com):

CREATE TABLE IF NOT EXISTS odds_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  odds FLOAT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odds_snapshots_match_id ON odds_snapshots(match_id);
CREATE INDEX IF NOT EXISTS idx_odds_snapshots_timestamp ON odds_snapshots(timestamp);
      `
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
