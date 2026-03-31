# Adaptive System Quick Reference

## The Problem

Traditional betting systems:
- Use static thresholds (always require 2% edge)
- Don't adjust for model reliability
- Don't leverage segment performance
- Lose money by overconfidence after lucky streaks

## The Solution

The **adaptive layer** automatically:
1. **Adjusts probabilities** when model has been systematically biased
2. **Boosts good segments** while reducing bad ones
3. **Dynamically scales thresholds** based on model reliability
4. **Sizes bets adaptively** - risky model = smaller bets

## Three Core Components

### 1. Probability Adjustment

When your model says 60% but historically overshoots, we subtract the error:

```
Adjusted Prob = Model Prob - Calibration Error
55% = 60% - 5% error
```

Prevents chasing losses with increasingly aggressive bets.

### 2. Segment Weighting

Each segment (league, bookmaker, odds range) gets a weight based on its own ROI:

```
Premier League: ROI +8% → weight 1.3x (30% boost)
La Liga: ROI -4% → weight 0.7x (30% reduction)
```

Allocates more capital to winning strategies.

### 3. Dynamic Thresholds

Min edge requirement adjusts with model reliability:

```
Model Calibration Error < 1.5% (reliable)
  → Min edge 1.2% (relaxed)

Model Calibration Error > 10% (unreliable)
  → Min edge 4% (strict)
```

Protects against taking weak bets when model is in doubt.

## API Usage

### Evaluate Single Bet

```bash
curl -X POST http://localhost:3002/api/bet/adaptive-evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "bets": [{
      "id": "bet-123",
      "fixture_id": 12345,
      "prediction": "home_win",
      "odds_taken": 1.85,
      "model_probability": 0.60,
      "stake": 100
    }],
    "bankroll": 1000
  }'
```

Response:
```json
{
  "decisions": {
    "totalBets": 1,
    "acceptedBets": 1,
    "totalStake": 23.5,
    "decisions": [{
      "action": "BET",
      "originalProb": 0.60,
      "adjustedProb": 0.575,
      "originalEdge": 0.081,
      "adjustedEdge": 0.056,
      "calibrationError": 0.025,
      "stake": 23.5,
      "riskLevel": "MEDIUM"
    }]
  }
}
```

### Build Custom Context

```typescript
import { buildAdaptiveContext } from "@/lib/engine/adaptiveExecution";

const context = buildAdaptiveContext({
  totalCalibrationError: 0.08,  // Model overshoots by 8%
  recentBets: [
    { won: true, modelProb: 0.65 },
    { won: false, modelProb: 0.60 },
    // ... last 50 bets
  ],
  segmentWeights: new Map([
    ["premier_league", 1.2],  // Good performance
    ["championship", 0.9],    // Okay
    ["smaller_leagues", 0.5]  // Bad performance
  ])
});
```

## Key Metrics Explained

| Metric | Meaning | Range |
|--------|---------|-------|
| `originalProb` | What model predicted | 0-1 |
| `adjustedProb` | After calibration adjustment | 0-1 |
| `originalEdge` | Before adjustment | -1 to +1 |
| `adjustedEdge` | After adjustment (actual edge for decision) | -1 to +1 |
| `calibrationError` | How wrong model was historically | 0-1 |
| `dynamicThreshold` | Min edge needed (context-dependent) | 0-1 |
| `segmentWeight` | Capital allocation to this segment | 0.3-1.5 |
| `riskLevel` | LOW/MEDIUM/HIGH based on reliability | categorical |

## Decision Logic

```
IF adjustedEdge >= dynamicThreshold:
  ACCEPT BET
  stake = Kelly * segmentWeight * (1/4 fractional) * reliability_multiplier
  
ELSE:
  REJECT BET
  reason = "Edge below threshold"
```

## When to Use Each Mode

### Static Mode (`/api/bet/evaluate`)
- Testing/paper trading
- Single-sport arbitrage
- When you trust your probabilities

### Adaptive Mode (`/api/bet/adaptive-evaluate`)
- Live trading with real money
- When model has been mis-calibrated
- Multi-segment operations
- After seeing significant drawdown
- When you want self-correction

## Tuning Parameters

### Probability Adjustment
```typescript
// In adjustment.ts, adjust these formulas:
adjustedProb = modelProb - (calibrationError * confidenceScale)
// Higher confidenceScale = more aggressive adjustment
```

### Segment Weighting
```typescript
// In segmentWeights.ts, adjust performance thresholds:
if (roi > 0.10) weight = 1.3  // Change 0.10 to other threshold
if (roi < -0.05) weight = 0.5 // Change -0.05 to other threshold
```

### Dynamic Thresholds
```typescript
// In adaptiveFilter.ts, adjust these cutoffs:
if (calibrationError > 0.1) threshold = 0.04  // Change 0.1 or 0.04
if (calibrationError < 0.015) threshold = 0.012
```

## Examples

### Example 1: Overconfident Model

**Situation**: Model was 8% overconfident (predicts 60%, actually 55%)

```
Original: 60% prob, 1.85 odds → 5.8% edge → ACCEPT at $30
Adjusted: 52% prob, 1.85 odds → -0.5% edge → REJECT

Result: Avoided bad bet! ✅
```

### Example 2: Strong Segment

**Situation**: Premier League has ROI +12%, La Liga has ROI -8%

```
Premier League bet: Kelly * 1.3x segment weight
La Liga bet: Kelly * 0.5x segment weight

Result: Boost good strategy, reduce bad one ✅
```

### Example 3: Unreliable Model

**Situation**: Calibration error is 12% (model very wrong)

```
Normal min edge: 2%
Adaptive min edge: 4% (doubled to be safe)

Weak edge bets rejected
Only high-confidence bets accepted
Result: Protect capital while relearning ✅
```

## Monitoring

Check model health frequently:

```bash
# Get calibration status
curl http://localhost:3002/api/analytics/report

# Look for these signals:
- "overconfident" → Adjust down
- "underconfident" → Adjust up  
- High calibration error → Stricter thresholds
- Good edge health → Relax thresholds
```

## Safety Checks

The system automatically:
- ✅ Prevents Kelly sizing > 2% of bankroll
- ✅ Rejects bets when probability too close to 50/50
- ✅ Reduces sizing when model reliability drops
- ✅ Sends Telegram alerts on major changes
- ✅ Can be paused with `liveExecutor.pause()`

## Next Steps

1. Deploy system with static mode
2. Collect 100+ settled bets
3. Check calibration report
4. Switch to adaptive mode if calibration error > 3%
5. Monitor segment performance
6. Enable Telegram alerts for live signals
7. Add portfolio allocation for multi-strategy operation
