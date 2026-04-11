-- Create team_ratings table for real EPL team ratings
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS team_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name text UNIQUE NOT NULL,
  attack numeric NOT NULL,
  defence numeric NOT NULL,
  home_attack numeric NOT NULL,
  home_defence numeric NOT NULL,
  away_attack numeric NOT NULL,
  away_defence numeric NOT NULL,
  games_played integer NOT NULL,
  goals_for integer NOT NULL,
  goals_against integer NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_ratings_name ON team_ratings(team_name);
CREATE INDEX IF NOT EXISTS idx_team_ratings_updated ON team_ratings(updated_at);
