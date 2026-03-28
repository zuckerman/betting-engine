# Betting Scorer - Production Betting Metrics Engine

Phase 1: Core engine + API validation endpoint

## What This Is

A **production-grade scoring system** that tells you objectively whether your betting strategy has an edge.

No theory. Just math + thresholds that force decisions.

## Quick Start

```bash
npm install
npm run dev
```

Then visit:
- **Home**: http://localhost:3000
- **Test Suite**: http://localhost:3000/test
- **API**: POST http://localhost:3000/api/bettor/score

## API Usage

```bash
curl -X POST http://localhost:3000/api/bettor/score \
  -H "Content-Type: application/json" \
  -d '{
    "bets": [
      {
        "odds_taken": 1.95,
        "odds_closing": 1.92,
        "stake": 100,
        "result": "win",
        "market_type": "moneyline",
        "league": "NBA"
      }
    ]
  }'
```

## Core Metrics

### CLV (Closing Line Value)
```
CLV = (odds_taken / odds_closing) - 1
```
- Positive = you beat the market
- Negative = market beat you

### xROI (Expected ROI)
```
xROI = avg((odds_taken * P_closing) - 1)
```
Where `P_closing = 1 / odds_closing`

### ROI (Actual ROI)
```
ROI = profit / total_stake
```

### Confidence
```
Confidence = 1 - e^(-N / 300)
```
- 100 bets → ~28%
- 300 bets → ~63%
- 1000 bets → ~96%

## Decision Rules

### 🔴 RED (Stop)
- N ≥ 300
- CLV < -0.01
- xROI < -0.02

You are structurally losing.

### 🟠 AMBER (Refine)
- Default state
- -0.01 ≤ CLV ≤ 0.01 OR -1% ≤ xROI ≤ 1%

You are noise / marginal.

### 🟢 GREEN (Scale)
- N ≥ 300
- CLV > 0.01
- xROI > 0.01

Confirmed edge.

### ⚫ BLACK (Invalid)
- N < 100

No decision allowed.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── bettor/
│   │       └── score/
│   │           └── route.ts          # POST endpoint
│   ├── test/
│   │   └── page.tsx                   # Test suite UI
│   └── page.tsx                       # Home
├── lib/
│   └── engine/
│       ├── types.ts                   # All types
│       ├── utils.ts                   # Math helpers
│       ├── scoring.ts                 # Core calculations
│       ├── classifier.ts              # Decision logic
│       ├── integrity.ts               # Overfit + CLV checks
│       ├── metricsService.ts          # Orchestrator
│       └── testData.ts                # Test scenarios
```

## Test Scenarios

Run the test suite at `/test` to validate:

1. **Small Sample (BLACK)** - 50 bets
2. **Negative Edge (RED)** - 350 bets, losing
3. **Positive Edge (GREEN)** - 350 bets, winning
4. **Marginal Edge (AMBER)** - 300 bets, near zero
5. **Variance Drawdown** - positive xROI, negative ROI
6. **Overfit Detection** - strong in NBA, weak in EPL
7. **Mixed Strategy** - diverse results

## Response Format

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

## Phase 2 (Next Steps)

- [ ] PostgreSQL + Prisma schema
- [ ] Persistent bet storage
- [ ] Background metric recalculation
- [ ] Portfolio-level scoring
- [ ] Stake sizing engine (Kelly-based)
- [ ] Auto-strategy shutdown triggers

## Key Design Decision

This system rewards **being right**, not **winning**.

That's the entire game.
