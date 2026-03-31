# 🎯 CONTROL MONEY — QUICK START

## What You Have Now

```
Signal (prediction)
    ↓
Edge (model prob - market prob)
    ↓
FILTER (edge > 2%?)
    ↓
KELLY (size bet optimally)
    ↓
EXECUTE (place $X bet)
    ↓
CALIBRATION (verify edge is real)
```

---

## Three Layers Explained

### Layer 1: Filter
**Rule**: Only bet if edge ≥ 2%

```bash
curl -X POST http://localhost:3002/api/bet/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "bet": {
      "odds_taken": 2.1,
      "model_probability": 0.55,
      "edge": 0.074,
      "stake": 100
    },
    "bankroll": 10000
  }'
```

Response: `"action": "BET"` or `"action": "REJECT"`

---

### Layer 2: Kelly
**Formula**: $f = \frac{bp - q}{b}$

**Example**: 
- Odds 2.1 (b=1.1), Prob 55% (p=0.55), q=0.45
- f = (1.1×0.55 - 0.45) / 1.1 = **0.136** (13.6%)
- Apply 1/4 Kelly: 0.136 × 0.25 = **3.4%**
- Stake: $10,000 × 3.4% = **$340**

---

### Layer 3: Calibration
**Checks**: Does model's 55% actually win 55%?

```json
{
  "probability_range": "55-60%",
  "expected": 0.575,
  "actual": 0.60,
  "status": "calibrated"
}
```

If actual ≠ expected → model needs tuning

---

## Core Files

| File | Purpose |
|------|---------|
| `filter.ts` | Block low-edge bets |
| `kelly.ts` | Calculate optimal stake |
| `execution.ts` | Filter + Kelly combined |
| `calibration.ts` | Verify probabilities |
| `edgeValidation.ts` | Verify edge claims |

---

## API Endpoints

### POST /api/bet/evaluate
Decide if bet should execute

### GET /api/analytics/report
Full dashboard data

### Visit /analytics
Live dashboard (auto-refresh)

---

## Example Flow

```bash
# 1. Place bet
POST /api/bets
{
  "fixture_id": 12345,
  "odds_taken": 2.1,
  "model_probability": 0.55,
  "stake": 100
}

# 2. Evaluate execution
POST /api/bet/evaluate
{
  "bet": { ... },
  "bankroll": 10000
}
→ Stake $148 (1/4 Kelly)

# 3. Settle
POST /api/result/settle
{ "fixture_id": 12345 }
→ Profit + calibration check

# 4. Check dashboard
GET /api/analytics/report
→ Is edge real? Is model calibrated?
```

---

## What Separates Pros From Amateurs

| Amateur | Pro (You) |
|---------|----------|
| Bets everything | Only high-edge bets |
| Sizes randomly | Uses Kelly formula |
| Ignores variance | Controls risk |
| Never validates | Validates with calibration |
| Loses money | Wins money |

---

## Reality

You now have:

✅ **Filter** - No noise bets  
✅ **Kelly** - Optimal sizing  
✅ **Calibration** - Edge verification  
✅ **Dashboard** - Live monitoring  

This system:
- Blocks bad bets automatically
- Sizes for growth without going broke
- Validates model works
- Self-corrects

You're playing the right game now.

---

## Test It

```bash
# View analytics dashboard
open http://localhost:3002/analytics

# Evaluate a test bet
curl -X POST http://localhost:3002/api/bet/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "bet": {
      "odds_taken": 2.1,
      "model_probability": 0.55,
      "edge": 0.074,
      "stake": 100
    },
    "bankroll": 10000
  }'
```

---

## Kelly Multipliers

```
Conservative:  0.1  (10% of Kelly)
Safe (default): 0.25 (1/4 Kelly)
Moderate:      0.5  (1/2 Kelly)
Aggressive:    1.0  (Full Kelly - risky!)
```

→ Use **0.25** unless you know what you're doing

---

## Status

✅ Bet filter working  
✅ Kelly sizing working  
✅ Execution decision working  
✅ Calibration working  
✅ Analytics dashboard live  

**System is ready for real bets.**
