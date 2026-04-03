-- ============================================================================
-- EDGE & CLV MEASUREMENT AUDIT
-- Run this in Supabase SQL Editor to verify data integrity
-- ============================================================================

-- ============================================================================
-- 1. DATA QUALITY CHECK
-- ============================================================================

SELECT 
  'TOTAL PREDICTIONS' as metric,
  COUNT(*) as value
FROM predictions
UNION ALL
SELECT 
  'WITH CLOSING ODDS',
  COUNT(CASE WHEN closing_odds IS NOT NULL THEN 1 END)
FROM predictions
UNION ALL
SELECT 
  'WITH RESULTS',
  COUNT(CASE WHEN result IS NOT NULL THEN 1 END)
FROM predictions
UNION ALL
SELECT 
  'WITH CLV CALCULATED',
  COUNT(CASE WHEN closing_odds IS NOT NULL AND opening_odds IS NOT NULL THEN 1 END)
FROM predictions;

-- ============================================================================
-- 2. IMPLIED PROBABILITY CHECK
-- Should match: 1 / odds
-- ============================================================================

SELECT 
  id,
  opening_odds,
  (1::float / opening_odds) as implied_probability_correct,
  ROUND((1::float / opening_odds)::numeric, 4) as implied_pct
FROM predictions
WHERE opening_odds IS NOT NULL
LIMIT 10;

-- ============================================================================
-- 3. EDGE CALCULATION (vs Opening Odds)
-- edge = model_probability - implied_probability
-- ============================================================================

SELECT 
  id,
  model_probability,
  opening_odds,
  (1::float / opening_odds) as implied_prob,
  (model_probability - (1::float / opening_odds)) as edge,
  ROUND((model_probability - (1::float / opening_odds))::numeric * 100, 2) as edge_pct
FROM predictions
WHERE model_probability IS NOT NULL 
  AND opening_odds IS NOT NULL
LIMIT 10;

-- Check edge distribution (should be roughly -0.15 to +0.15)
SELECT 
  ROUND((model_probability - (1::float / opening_odds))::numeric, 3) as edge_bucket,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM predictions WHERE model_probability IS NOT NULL AND opening_odds IS NOT NULL) * 100, 1) as pct
FROM predictions
WHERE model_probability IS NOT NULL 
  AND opening_odds IS NOT NULL
GROUP BY edge_bucket
ORDER BY edge_bucket;

-- ============================================================================
-- 4. CLV CALCULATION (vs Closing Odds)
-- CLV = (1/closing_odds) - (1/opening_odds)
-- Positive CLV = you beat the market's final assessment
-- ============================================================================

SELECT 
  id,
  opening_odds,
  closing_odds,
  (1::float / closing_odds) - (1::float / opening_odds) as clv,
  ROUND(((1::float / closing_odds) - (1::float / opening_odds))::numeric * 100, 2) as clv_pct,
  result
FROM predictions
WHERE closing_odds IS NOT NULL 
  AND opening_odds IS NOT NULL
LIMIT 10;

-- Check CLV distribution (should be centered near 0)
SELECT 
  ROUND(((1::float / closing_odds) - (1::float / opening_odds))::numeric, 3) as clv_bucket,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM predictions WHERE closing_odds IS NOT NULL AND opening_odds IS NOT NULL) * 100, 1) as pct
FROM predictions
WHERE closing_odds IS NOT NULL 
  AND opening_odds IS NOT NULL
GROUP BY clv_bucket
ORDER BY clv_bucket;

-- ============================================================================
-- 5. PROBABILITY CALIBRATION
-- Are your model probabilities matching reality?
-- Perfect calibration: avg_model_prob = actual_win_rate
-- ============================================================================

SELECT 
  ROUND(AVG(model_probability)::numeric, 4) as avg_model_probability,
  ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*), 4) as actual_win_rate,
  ROUND((AVG(model_probability) - (SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*)))::numeric * 100, 2) as calibration_error_pct,
  COUNT(*) as sample_size
FROM predictions
WHERE model_probability IS NOT NULL 
  AND result IS NOT NULL;

-- ============================================================================
-- 6. OVERALL CLV (THE PRIMARY SIGNAL)
-- Average CLV > 0 = you beat the market consistently
-- ============================================================================

SELECT 
  ROUND(AVG((1::float / closing_odds) - (1::float / opening_odds))::numeric, 5) as avg_clv,
  ROUND(AVG((1::float / closing_odds) - (1::float / opening_odds))::numeric * 100, 2) as avg_clv_pct,
  SUM(CASE WHEN (1::float / closing_odds) - (1::float / opening_odds) > 0 THEN 1 ELSE 0 END) as bets_beating_line,
  COUNT(*) as total_bets_with_closing,
  ROUND(SUM(CASE WHEN (1::float / closing_odds) - (1::float / opening_odds) > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as pct_beating_line
FROM predictions
WHERE closing_odds IS NOT NULL 
  AND opening_odds IS NOT NULL;

-- ============================================================================
-- 7. WIN RATE (Secondary signal - only meaningful with good calibration)
-- ============================================================================

SELECT 
  SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
  COUNT(CASE WHEN result IS NOT NULL THEN 1 END) as total_settled,
  ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(CASE WHEN result IS NOT NULL THEN 1 END) * 100, 1) as win_pct,
  ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(CASE WHEN result IS NOT NULL THEN 1 END) - 0.5, 4) as win_rate_vs_50pct
FROM predictions
WHERE result IS NOT NULL;

-- ============================================================================
-- 8. ROI (For context only - depends on both CLV and win rate)
-- ROI = (Total Profit) / (Total Stake)
-- If stake = 1 unit per bet: ROI = Total Profit / Number of Bets
-- ============================================================================

WITH bets AS (
  SELECT 
    CASE WHEN result = 'win' THEN (opening_odds - 1) ELSE -1 END as profit,
    1 as stake
  FROM predictions
  WHERE result IS NOT NULL
)
SELECT 
  ROUND(SUM(profit)::numeric, 2) as total_profit,
  COUNT(*) as total_bets,
  ROUND((SUM(profit) / COUNT(*))::numeric, 4) as avg_profit_per_bet,
  ROUND((SUM(profit) / SUM(stake) * 100)::numeric, 2) as roi_pct;

-- ============================================================================
-- 9. SEGMENTED ANALYSIS (By League)
-- ============================================================================

SELECT 
  league,
  COUNT(*) as total_bets,
  COUNT(CASE WHEN closing_odds IS NOT NULL THEN 1 END) as with_closing,
  ROUND(AVG((1::float / closing_odds) - (1::float / opening_odds))::numeric * 100, 2) as avg_clv_pct,
  ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(CASE WHEN result IS NOT NULL THEN 1 END) * 100, 1) as win_pct
FROM predictions
WHERE closing_odds IS NOT NULL 
  AND opening_odds IS NOT NULL
GROUP BY league
ORDER BY avg_clv_pct DESC;

-- ============================================================================
-- 10. SEGMENTED ANALYSIS (By Market Type)
-- ============================================================================

SELECT 
  market,
  COUNT(*) as total_bets,
  COUNT(CASE WHEN closing_odds IS NOT NULL THEN 1 END) as with_closing,
  ROUND(AVG((1::float / closing_odds) - (1::float / opening_odds))::numeric * 100, 2) as avg_clv_pct,
  ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(CASE WHEN result IS NOT NULL THEN 1 END) * 100, 1) as win_pct
FROM predictions
WHERE closing_odds IS NOT NULL 
  AND opening_odds IS NOT NULL
GROUP BY market
ORDER BY avg_clv_pct DESC;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
/*
WHAT TO LOOK FOR:

1. avg_clv_pct
   ✅ > 0.03 (3%) = Strong edge (elite)
   ✅ > 0.01 (1%) = Real edge (good)
   ⚠️  0 to 0.01 = Weak/developing
   ❌ < 0 = Market beats you (problem)

2. win_pct
   ✅ > 55% = Better than 50/50
   ⚠️  50-55% = Close to market
   ❌ < 50% = Worse than 50/50 (problem)

3. calibration_error_pct
   ✅ < 5% = Well calibrated
   ⚠️  5-10% = Slightly overconfident
   ❌ > 10% = Significantly overconfident (BAD)

4. pct_beating_line
   ✅ > 50% = Getting better odds than close
   ⚠️  45-55% = Mixed
   ❌ < 45% = Getting worse odds (problem)

REAL EDGE = Positive CLV + Win rate > 55% + Calibration error < 5%
*/
