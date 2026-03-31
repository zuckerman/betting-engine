# 🧠 Full End-to-End Betting Pipeline

## What's Happening

```
Prediction ➜ Bet Placement ➜ Settlement ➜ Scoring ➜ Portfolio Metrics
```

---

## Step 1: Run predictions

```bash
POST http://localhost:3002/api/predict/football

{
  "home_team": "Arsenal",
  "away_team": "Man City",
  "home_avg_scored": 1.8,
  "home_avg_conceded": 1.1,
  "away_avg_scored": 1.7,
  "away_avg_conceded": 1.2,
  "home_odds": 2.5,
  "draw_odds": 3.2,
  "away_odds": 2.8
}
```

Response includes: `should_bet`, `best_bet`, `confidence`, `best_value`

---

## Step 2: Place a bet (if should_bet = true)

```bash
POST http://localhost:3002/api/bets

{
  "fixture_id": 12345,
  "prediction": "home_win",
  "odds_taken": 2.5,
  "odds_closing": 2.45,
  "stake": 100
}
```

Response:

```json
{
  "status": "placed",
  "bet": {
    "id": "bet_12345_1711785600000",
    "fixture_id": 12345,
    "prediction": "home_win",
    "odds_taken": 2.5,
    "odds_closing": 2.45,
    "stake": 100,
    "status": "open"
  }
}
```

---

## Step 3: Wait for match to finish

Then settle it...

---

## Step 4: Settle with Sportmonks

```bash
POST http://localhost:3002/api/result/settle

{
  "fixture_id": 12345
}
```

This endpoint:

1. **Fetches** verified result from Sportmonks
2. **Finds** associated bet by fixture_id
3. **Scores** the bet (calculates profit + CLV)
4. **Saves** updated bet with result + profit
5. **Recalculates** portfolio metrics across ALL bets
6. **Returns**: settled bet + portfolio metrics

Response:

```json
{
  "status": "settled",
  "bet": {
    "id": "bet_12345_1711785600000",
    "fixture_id": 12345,
    "prediction": "home_win",
    "result": "home_win",
    "odds_taken": 2.5,
    "stake": 100,
    "profit": 150,
    "clv": 0.02,
    "won": true
  },
  "match": {
    "home_team": "Arsenal",
    "away_team": "Man City",
    "score": "2-1"
  },
  "portfolio": {
    "totalBets": 9,
    "totalProfit": 95,
    "totalStake": 900,
    "roi": 0.1056,
    "winRate": 0.6667
  }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/lib/engine/types.ts` | PredictionBet interface |
| `/lib/engine/scoreBet.ts` | Score single bet (profit + CLV) |
| `/lib/engine/bettingService.ts` | Bet storage (in-memory for now) |
| `/lib/engine/portfolioMetrics.ts` | Calculate aggregate metrics |
| `/app/api/bets/route.ts` | Place/retrieve bets |
| `/app/api/result/settle/route.ts` | Complete settlement pipeline |

---

## What's Being Measured

✅ **Profit**: Did we make money?
✅ **CLV**: Did we get value vs closing odds?
✅ **ROI**: How efficient are our bets?
✅ **Win Rate**: What's our accuracy?
✅ **Portfolio Metrics**: How are we doing overall?

---

## Missing: EDGE

Next step: Connect your Poisson predictions to this scoring system so we can measure:

```
edge = model_probability - implied_probability
```

This tells you where you're beating the market. That's where the money is.

---

## Test Flow

```bash
# 1. Place a bet
curl -X POST http://localhost:3002/api/bets \
  -H "Content-Type: application/json" \
  -d '{"fixture_id": 12345, "prediction": "home_win", "odds_taken": 2.5, "odds_closing": 2.45, "stake": 100}'

# 2. Settle it (after match finishes)
curl -X POST http://localhost:3002/api/result/settle \
  -H "Content-Type: application/json" \
  -d '{"fixture_id": 12345}'

# 3. Check all bets
curl http://localhost:3002/api/bets
```

---

## Status

✅ Prediction engine
✅ Bet placement
✅ Result settlement (Sportmonks)
✅ Bet scoring (profit + CLV)
✅ Portfolio metrics
❌ EDGE calculation (next)
❌ Database persistence (later)
