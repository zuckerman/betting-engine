-- Add Closing Line Prediction (CLP) and Market Movement Tracking (MMT)
-- This enables diagnostic analysis of where edge actually exists

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS league text DEFAULT 'EPL',
ADD COLUMN IF NOT EXISTS predicted_closing_odds numeric,
ADD COLUMN IF NOT EXISTS market_movement numeric,
ADD COLUMN IF NOT EXISTS clp_error numeric,
ADD COLUMN IF NOT EXISTS signal_quality numeric,
ADD COLUMN IF NOT EXISTS time_to_kickoff_hours integer,
ADD COLUMN IF NOT EXISTS edge_bucket text;

-- Indexes for fast querying by league and diagnostics
CREATE INDEX IF NOT EXISTS idx_predictions_league ON predictions(league);
CREATE INDEX IF NOT EXISTS idx_predictions_edge_bucket ON predictions(edge_bucket);
CREATE INDEX IF NOT EXISTS idx_predictions_time_to_kickoff ON predictions(time_to_kickoff_hours);

-- Diagnostic view: aggregate metrics by market
CREATE VIEW IF NOT EXISTS market_diagnostics AS
SELECT
  league,
  system_version,
  edge_bucket,
  COUNT(*) as bet_count,
  COUNT(CASE WHEN settled = true THEN 1 END) as settled_count,
  ROUND(AVG(CASE WHEN settled = true THEN clv ELSE NULL END)::numeric, 4) as avg_clv,
  ROUND(AVG(CASE WHEN settled = true THEN market_movement ELSE NULL END)::numeric, 4) as avg_movement,
  ROUND(AVG(CASE WHEN settled = true THEN ABS(clp_error) ELSE NULL END)::numeric, 4) as avg_clp_error,
  ROUND(AVG(CASE WHEN settled = true THEN signal_quality ELSE NULL END)::numeric, 4) as avg_signal_quality,
  ROUND((COUNT(CASE WHEN settled = true AND clv > 0 THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN settled = true THEN 1 END), 0) * 100)::numeric, 1) as positive_clv_pct
FROM predictions
WHERE settled = true
GROUP BY league, system_version, edge_bucket
ORDER BY league, system_version;

-- Diagnostic view: by timing (early vs late market)
CREATE VIEW IF NOT EXISTS timing_diagnostics AS
SELECT
  league,
  CASE
    WHEN time_to_kickoff_hours > 24 THEN 'early_24h_plus'
    WHEN time_to_kickoff_hours > 6 THEN 'mid_6h_24h'
    ELSE 'late_under_6h'
  END as timing_bucket,
  COUNT(*) as bet_count,
  COUNT(CASE WHEN settled = true THEN 1 END) as settled_count,
  ROUND(AVG(CASE WHEN settled = true THEN clv ELSE NULL END)::numeric, 4) as avg_clv,
  ROUND((COUNT(CASE WHEN settled = true AND clv > 0 THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN settled = true THEN 1 END), 0) * 100)::numeric, 1) as positive_clv_pct
FROM predictions
WHERE settled = true
GROUP BY league, timing_bucket
ORDER BY league, timing_bucket;
