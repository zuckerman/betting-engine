# 🧠 EDGE: The Core of Quantitative Betting

## What Edge Is (and What It Isn't)

**NOT**: "Will this bet win?"
**IS**: "Is the price wrong?"

---

## The Formula

$$\text{Edge} = p_{\text{model}} - p_{\text{market}}$$

Where:
- $p_{\text{model}}$ = Your model's probability for the outcome
- $p_{\text{market}} = \frac{1}{\text{odds}_{\text{taken}}}$

---

## Example

| Component | Value |
|-----------|-------|
| Your model probability | 55% (0.55) |
| Market odds | 2.10 |
| Implied market probability | 1 ÷ 2.10 = 47.6% |
| **Edge** | 55% - 47.6% = **+7.4%** |

→ **+7.4% edge is STRONG**

---

## How Your System Uses Edge

### 1. **Per-Bet Edge** (calculate on placement)

```bash
POST /api/bets

{
  "fixture_id": 12345,
  "prediction": "home_win",
  "odds_taken": 2.10,
  "model_probability": 0.55,
  "stake": 100
}

Response:
{
  "analysis": {
    "model_probability": "0.5500",
    "market_probability": "0.4762",
    "edge": "0.0738",
    "edge_percentage": "7.38%"
  }
}
```

### 2. **Portfolio-Level Edge** (calculate on settlement)

```bash
POST /api/result/settle

{
  "fixture_id": 12345
}

Response:
{
  "portfolio": {
    "total_bets": 9,
    "avg_edge": "0.0342"  // Average edge across all bets
  }
}
```

---

## Calibration: The Real Test

Your system automatically checks if your edges actually translate to wins.

### Edge Buckets

| Bucket | Edge Range | Expected Win% | Your Actual |
|--------|-----------|---------------|------------|
| Negative | < 0% | ~45% | ? |
| Low | 0–2% | ~50.5% | ? |
| Medium | 2–5% | ~53.5% | ? |
| High | 5%+ | ~55.5%+ | ? |

### Calibration Response

```json
{
  "calibration": {
    "health": "✓ Healthy",
    "summary": "Model is well-calibrated",
    "breakdown": [
      {
        "edge_bucket": "0-2% Edge",
        "bets_in_bucket": 3,
        "actual_win_rate": "0.5200",
        "expected_win_rate": "0.5050",
        "status": "calibrated"
      },
      {
        "edge_bucket": "5%+ Edge",
        "bets_in_bucket": 2,
        "actual_win_rate": "0.8500",
        "expected_win_rate": "0.5550",
        "status": "under-confident"
      }
    ]
  }
}
```

---

## What Each Status Means

### ✓ **Calibrated**
Your model's claims match reality.

```
Expected 53.5% → Actual 54.1%
→ Model is trustworthy
```

### ⚠️ **Over-Confident**
Your model thinks it has more edge than it does.

```
Expected 53.5% → Actual 48.2%
→ Model is OPTIMISTIC
→ Your edge may be illusory
```

### ⚠️ **Under-Confident**
Your model is pessimistic. You're beating the market more than your model thinks.

```
Expected 53.5% → Actual 62.1%
→ Model is PESSIMISTIC
→ Real edge may be higher than thought
```

---

## How to Use This

### With Small Sample Size (< 20 bets)

- Track edge but don't overreact
- Calibration noise is expected
- Just ensure no major red flags

### With Medium Sample Size (20–50 bets)

- Watch for patterns
- If one bucket is consistently over/under-confident, investigate why
- Model may need adjustment

### With Large Sample Size (50+ bets)

- Calibration tells you if your model is predictive
- If calibrated: Keep betting
- If over-confident: Reduce position sizes
- If under-confident: Increase position sizes (or find new edges)

---

## Files

| File | Purpose |
|------|---------|
| `/lib/engine/edge.ts` | Edge calculation + calibration analysis |
| `/lib/engine/types.ts` | PredictionBet includes `model_probability` |
| `/app/api/bets/route.ts` | POST accepts `model_probability`, shows edge |
| `/app/api/result/settle/route.ts` | Settlement includes edge + calibration check |

---

## Integration Points

### When You Make a Prediction

```ts
// /api/predict/football returns:
{
  "confidence": 0.77,      // Your confidence in outcome
  "best_bet": "home_win",
  "should_bet": true
}

// YOU must convert confidence to probability:
// This becomes model_probability in /api/bets
```

### When You Place a Bet

```ts
POST /api/bets
{
  "fixture_id": 12345,
  "prediction": "home_win",
  "odds_taken": 2.10,
  "model_probability": 0.77,  // ← from confidence
  "stake": 100
}
```

### When Match Settles

```ts
POST /api/result/settle
{
  "fixture_id": 12345
}

// Returns: edge + calibration check
// Shows if your edge claim was real
```

---

## The Loop That Matters

```text
Prediction
    ↓
Model Probability
    ↓
Bet with Edge
    ↓
Result
    ↓
Edge Check
    ↓
Calibration Report
    ↓
Did edge translate to wins?
    ↓
Adjust Model (or Trust It)
    ↓
REPEAT
```

---

## Reality Check

**Most bettors:**
- Think they have edge ❌
- Don't measure it ❌
- Lose money ❌

**You now:**
- Calculate edge ✅
- Track per-bet edge ✅
- Measure calibration ✅
- Know if your model works ✅

---

## Next Evolution

Once edge is solid:

1. **Kelly Staking** - Size bets by edge
2. **Bet Filtering** - Only execute +EV bets
3. **Segment Analysis** - Edge by league/market/timing
4. **Model Retraining** - Improve model based on calibration

The system you're building now is the foundation for all of that.
