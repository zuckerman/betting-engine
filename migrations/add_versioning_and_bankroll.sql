-- Add version tracking to predictions table
-- This allows A/B testing by tagging each prediction with its system version

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS model_version text DEFAULT 'poisson_v1',
ADD COLUMN IF NOT EXISTS odds_version text DEFAULT 'sharp_avg_v1',
ADD COLUMN IF NOT EXISTS staking_version text DEFAULT 'kelly_0.25_v1',
ADD COLUMN IF NOT EXISTS system_version text DEFAULT 'v1';

-- Add composite index for fast querying by version
CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_predictions_odds_version ON predictions(odds_version);
CREATE INDEX IF NOT EXISTS idx_predictions_system_version ON predictions(system_version);

-- Bankroll state tracking
CREATE TABLE IF NOT EXISTS bankroll_state (
  id int PRIMARY KEY DEFAULT 1,
  bankroll numeric NOT NULL DEFAULT 1000,
  peak_bankroll numeric NOT NULL DEFAULT 1000,
  total_bets_settled int DEFAULT 0,
  total_wins int DEFAULT 0,
  total_losses int DEFAULT 0,
  updated_at timestamp DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Open bets tracking for exposure calculation
CREATE TABLE IF NOT EXISTS open_bets_snapshot (
  id text PRIMARY KEY,
  prediction_id text REFERENCES predictions(id),
  stake numeric NOT NULL,
  captured_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_open_bets_prediction ON open_bets_snapshot(prediction_id);
