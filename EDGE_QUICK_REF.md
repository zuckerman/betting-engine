# 🚀 EDGE SYSTEM — QUICK REFERENCE

## The Formula (All You Need to Know)

$$\text{Edge} = p_{\text{model}} - \frac{1}{\text{odds}}$$

**Example**:
- Model: 55% → 0.55
- Odds: 2.10 → implied: 1/2.10 = 0.476
- Edge: 0.55 - 0.476 = **+0.074 (+7.4%)**

---

## API Flow

### 1. Place Bet
```bash
POST /api/bets
{
  "fixture_id": 12345,
  "prediction": "home_win",
  "odds_taken": 2.10,
  "model_probability": 0.55,
  "stake": 100
}

→ Response shows edge: +7.38%
```

### 2. Settle Bet
```bash
POST /api/result/settle
{
  "fixture_id": 12345
}

→ Response shows:
  • Profit
  • CLV
  • Edge
  • Portfolio metrics
  • Calibration check
```

---

## Key Metrics

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Edge** | model_prob - market_prob | Is price wrong? |
| **Profit** | (odds - 1) × stake if win; -stake if loss | Did we make money? |
| **CLV** | closing_prob - opening_prob | Did odds improve? |
| **ROI** | total_profit / total_stake | Efficiency |
| **Win Rate** | wins / total_bets | Accuracy |
| **Avg Edge** | Σ(edges) / num_bets | Beating market? |

---

## Calibration Buckets

| Edge Range | Expected Win% | Interpretation |
|------------|---------------|-----------------|
| < 0% | ~45% | Avoid (negative edge) |
| 0–2% | ~50.5% | Small edge |
| 2–5% | ~53.5% | Medium edge |
| 5%+ | ~55.5%+ | Strong edge |

---

## Files That Matter

```
/lib/engine/
├── edge.ts                  # Calculate + validate edge
├── scoreBet.ts              # Score bets with edge
├── portfolioMetrics.ts      # Aggregate edge
└── types.ts                 # Bet types

/app/api/
├── /bets                    # Place bets (shows edge)
└── /result/settle           # Settle + calibration
```

---

## Test Bet

**High Edge Bet** (+7.4%)
```bash
curl -X POST http://localhost:3002/api/bets \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": 555,
    "prediction": "home_win",
    "odds_taken": 2.10,
    "model_probability": 0.55,
    "stake": 100
  }'
```

**Low Edge Bet** (+0.5%)
```bash
curl -X POST http://localhost:3002/api/bets \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": 556,
    "prediction": "home_win",
    "odds_taken": 2.00,
    "model_probability": 0.52,
    "stake": 100
  }'
```

---

## What Good Looks Like

```json
{
  "portfolio": {
    "total_bets": 30,
    "roi": 0.15,           // +15% ROI
    "avg_edge": 0.035      // +3.5% average edge
  },
  "calibration": {
    "health": "✓ Healthy",
    "summary": "Model is well-calibrated"
  }
}
```

---

## What Bad Looks Like

```json
{
  "portfolio": {
    "roi": -0.08,          // -8% ROI
    "avg_edge": 0.005      // +0.5% edge (claims not matching results)
  },
  "calibration": {
    "health": "⚠ Issues Detected",
    "warnings": ["Over-confidence in 5%+ Edge bucket"]
  }
}
```

---

## Next Steps

1. **Get Sportmonks API key** (needed to settle bets with real data)
2. **Convert your confidence scores to probabilities**
   - confidence 77% → model_probability 0.77
3. **Place test bets** with different edges
4. **Wait for matches to settle**
5. **Check calibration**
   - Is actual win rate matching expected?

---

## Reality

This is what separates:

| Gambler | Quant |
|---------|-------|
| "I like this team" | "I have +7.4% edge" |
| No edge measurement | Measures edge precisely |
| Hopes for wins | Expects wins (statistically) |
| Loses over time | Wins over time |

You're building the quant side.
