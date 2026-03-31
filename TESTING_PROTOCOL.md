# Scale Testing Protocol (Frozen Rules)

## Frozen Decision Rules (DO NOT CHANGE)
```
shouldBet = confidence > 0.55 AND best_value > 0
```

## Testing Goal
Collect 30-50 bets with identical rules to validate edge signal.

---

## Test Flow (Repeatable)

### 1. Make Prediction
```bash
curl -X POST http://localhost:3002/api/predict/football \
-H "Content-Type: application/json" \
-d '{
  "home_team": "TEAM_A",
  "away_team": "TEAM_B",
  "home_avg_scored": X.X,
  "home_avg_conceded": X.X,
  "away_avg_scored": X.X,
  "away_avg_conceded": X.X,
  "home_odds": X.X,
  "draw_odds": X.X,
  "away_odds": X.X
}'
```

**Save:** `match_id` from response

**Only proceed if:** `"should_bet": true`

---

### 2. Record Result (After Match)
```bash
curl -X POST http://localhost:3002/api/result \
-H "Content-Type: application/json" \
-d '{
  "match_id": "SAVED_ID",
  "home_goals": N,
  "away_goals": N
}'
```

---

### 3. Check Performance (Every 5-10 bets)
```bash
curl http://localhost:3002/api/performance | jq '.'
```

---

## What To Track

After 30 bets, collect:

```json
{
  "total_matches": N,
  "bets_placed": N,
  "accuracy": X.XXX,
  "roi": X.XXXX,
  "bet_frequency": X.XX,
  "avg_odds": X.XX,
  "min_odds": X.X,
  "max_odds": X.X
}
```

---

## Do NOT Change

❌ `confidence` threshold
❌ `value` threshold
❌ `best_bet` logic
❌ Odds calculation
❌ Lambda calculation

---

## Next Checkpoint

**Target:** 30-50 bets
**Success:** ROI > 0 with stable frequency
**Fail:** ROI < -5% with erratic pattern

Report findings, do NOT interpret yet.

