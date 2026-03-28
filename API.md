# API Reference

## Base URL
```
http://localhost:3000
```

## Endpoint: Score Bets

### POST `/api/bettor/score`

Score a portfolio of bets and get instant classification.

---

## Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "bets": [
    {
      "odds_taken": 1.95,
      "odds_closing": 1.92,
      "stake": 100,
      "result": "win",
      "market_type": "moneyline",
      "league": "NBA",
      "odds_range": "tight",
      "settled_at": "2026-03-28T16:00:00Z"
    }
  ]
}
```

### Required Fields

- `odds_taken` (number): Decimal odds when you placed the bet
- `odds_closing` (number): Market odds at close
- `stake` (number): Amount wagered
- `result` (enum): `"win"` | `"loss"` | `"push"`

### Optional Fields

- `market_type` (string): e.g., "moneyline", "spread", "totals"
- `league` (string): e.g., "NBA", "EPL", "NFL"
- `odds_range` (string): Custom segment for analysis
- `settled_at` (ISO string): Settlement timestamp

---

## Response

```json
{
  "state": "AMBER",
  "metrics": {
    "clv": 0.012,
    "xroi": 0.018,
    "roi": -0.035,
    "confidence": 0.81,
    "z": -0.6
  },
  "diagnosis": "Positive edge, negative variance",
  "instruction": "Continue betting, reduce stake volatility",
  "riskFlags": ["variance_drawdown"]
}
```

### Response Fields

**`state`** (enum)
- `"GREEN"` - Confirmed edge, scale up
- `"RED"` - Confirmed loss, stop betting
- `"AMBER"` - Marginal or unclear, refine
- `"BLACK"` - Insufficient data, collect more

**`metrics`** (object)
- `clv` (number): Closing Line Value (0.012 = +1.2%)
- `xroi` (number): Expected ROI
- `roi` (number): Actual ROI
- `confidence` (0-1): How confident in result (based on N)
- `z` (number): Z-score (variance test)

**`diagnosis`** (string)
Human-readable explanation of the state.

**`instruction`** (string)
What action to take next.

**`riskFlags`** (array)
Warnings detected:
- `"insufficient_sample"` - N < 100
- `"structural_loss"` - CLV < -0.01 and xROI < -0.02
- `"variance_drawdown"` - xROI > 0 but ROI < 0
- `"high_variance"` - |Z| > 2
- `"noise_edge"` - Edge too close to zero
- `"overfit_by_league"` - Segment inconsistency
- `"overfit_by_market"` - Segment inconsistency
- `"overfit_by_odds_range"` - Segment inconsistency
- `"deteriorating_clv_edge"` - CLV getting worse

---

## Examples

### Example 1: Small Sample (BLACK)

**Request:**
```bash
curl -X POST http://localhost:3000/api/bettor/score \
  -H "Content-Type: application/json" \
  -d '{
    "bets": [
      {"odds_taken": 1.95, "odds_closing": 1.92, "stake": 100, "result": "win"},
      {"odds_taken": 1.95, "odds_closing": 1.92, "stake": 100, "result": "loss"}
    ]
  }'
```

**Response:**
```json
{
  "state": "BLACK",
  "metrics": {"clv": 0.0156, "xroi": 0.0156, "roi": 0, "confidence": 0.0066, "z": 0},
  "diagnosis": "Only 2 bets recorded. Minimum 100 required for analysis.",
  "instruction": "Collect more betting data before making decisions",
  "riskFlags": ["insufficient_sample"]
}
```

---

### Example 2: Confirmed Positive Edge (GREEN)

**Request:**
```bash
curl -X POST http://localhost:3000/api/bettor/score \
  -H "Content-Type: application/json" \
  -d '{
    "bets": [
      {"odds_taken": 2.05, "odds_closing": 1.95, "stake": 100, "result": "win"},
      {"odds_taken": 2.05, "odds_closing": 1.95, "stake": 100, "result": "loss"},
      {"odds_taken": 2.05, "odds_closing": 1.95, "stake": 100, "result": "win"},
      ... (repeat 347 times total for 350 bets) ...
    ]
  }'
```

**Response:**
```json
{
  "state": "GREEN",
  "metrics": {
    "clv": 0.0513,
    "xroi": 0.0513,
    "roi": 0.025,
    "confidence": 0.6886,
    "z": -0.4797
  },
  "diagnosis": "Positive edge confirmed: beating market AND positive ROI",
  "instruction": "Scale stake gradually. Monitor for consistency.",
  "riskFlags": []
}
```

---

### Example 3: Variance Drawdown (AMBER)

**Request:**
```bash
curl -X POST http://localhost:3000/api/bettor/score \
  -H "Content-Type: application/json" \
  -d '{
    "bets": [
      ... (200 bets with +5% edge, 50% win rate) ...
      ... (100 bets: all losses from bad variance) ...
    ]
  }'
```

**Response:**
```json
{
  "state": "AMBER",
  "metrics": {
    "clv": 0.0513,
    "xroi": 0.0513,
    "roi": -0.015,
    "confidence": 0.6321,
    "z": -0.8234
  },
  "diagnosis": "Positive edge detected, but experiencing variance drawdown",
  "instruction": "Continue betting. Reduce stake volatility to weather variance.",
  "riskFlags": ["variance_drawdown"]
}
```

---

## Error Responses

### 400 - Invalid Input
```json
{
  "error": "Invalid input: 'bets' must be a non-empty array"
}
```

### 400 - Missing Fields
```json
{
  "error": "Each bet must have: odds_taken, odds_closing, stake, result"
}
```

### 500 - Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Decision Guide

| State  | When | Action |
|--------|------|--------|
| BLACK  | N < 100 | Collect more data |
| RED    | N ≥ 300, CLV < -0.01, xROI < -0.02 | Stop betting |
| GREEN  | N ≥ 300, CLV > 0.01, xROI > 0.01 | Scale stake |
| AMBER  | Everything else | Refine strategy |

---

## Tips

1. **Always check confidence** - Below 50% is too early for hard decisions
2. **Watch the z-score** - Above 2 means something is wrong
3. **Verify each segment** - If one sports league is strong and another weak, you have overfit
4. **Feed 300+ bets** - This is where the system becomes trustworthy
5. **Follow the instruction** - Don't override it, implement it

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success - scoring complete |
| 400  | Bad request - invalid input |
| 500  | Server error - contact support |

---

## Rate Limiting

None currently. Use responsibly.

---

## Version

Phase 1 (Production Ready)

---

## Questions?

See:
- `README.md` - Quick start
- `PHASE_1_COMPLETE.md` - Architecture
- `DEPLOYMENT_READY.md` - Overview
