# 🧪 Closing Odds Capture & CLV System

**This is where CLV becomes REAL edge detection** (not estimate).

---

## 🎯 The Concept

### Before (Estimated CLV)
```text
odds_taken = 1.92
implied_prob = 1 / 1.92 = 0.521
model_prob = 0.58
edge = 0.58 - 0.521 = +0.059 ← Theoretical
```

### After (Real CLV)
```text
odds_taken = 1.92            (what you took at)
closing_odds = 1.87          (what it closed at)
closing_implied = 1 / 1.87 = 0.535
opening_implied = 1 / 1.92 = 0.521
CLV = 0.535 - 0.521 = +0.014 ← REAL (market moved against you = you were right)
```

---

## 📊 Why This Matters

**CLV = Market movement in your favor**

- ✅ Positive CLV → Market converged on better odds than you took → You found inefficiency
- ❌ Negative CLV → Market diverged to worse odds → You were lucky or wrong
- 🔒 This is the ONLY measure that proves edge without waiting for results

---

## 🔧 System Architecture

### 1. **Pipeline**
```
Your model → odds_taken logged
           ↓
        Cron every 30 min
           ↓
/api/settle-bets fetches closing odds
           ↓
Calculates CLV
           ↓
Updates predictions table
           ↓
Dashboard refreshes
```

### 2. **Data Flow**

**When prediction lands (via /api/generate):**
```json
{
  "event": "Arsenal vs Chelsea",
  "market": "Over 2.5 Goals",
  "modelProbability": 0.58,
  "oddsTaken": 1.92,
  "timestamp": "2026-04-03T09:00:00Z"
}
```

**After placement (stored):**
```json
{
  "id": "pred_123",
  "odds_taken": 1.92,
  "model_probability": 0.58,
  "placed_at": "2026-04-03T09:00:00Z",
  "settled_at": null,
  "closing_odds": null,
  "clv": null
}
```

**After settlement (/api/settle-bets):**
```json
{
  "id": "pred_123",
  "odds_taken": 1.92,
  "closing_odds": 1.87,
  "clv": 0.014,      ← +1.4% CLV
  "result": "WIN",
  "settled_at": "2026-04-03T10:30:00Z"
}
```

---

## 🔌 Current Implementation

### Status: ✅ READY

**What exists:**
- ✅ `/api/settle-bets` - Runs every 30 min via Vercel cron
- ✅ Database schema - Has `closing_odds`, `clv`, `settled_at` columns
- ✅ Stats endpoint - Calculates real CLV from settled predictions
- ✅ Dashboard - Displays CLV metrics

**What's mock:**
- ⚠️ Closing odds fetching - Currently random variance (±5-15%)
- ⚠️ Result calculation - Currently 50/50 random

---

## 🎬 Workflow

### Step 1: Predictions Flow In

**Your model sends predictions daily at 9 AM UTC:**
```bash
npx ts-node scripts/send-predictions.ts
```

**Result in DB:**
- `placed_at` = now
- `odds_taken` = your odds
- `settling_at` = null (unsettled)
- `clv` = null (not calculated yet)

### Step 2: Auto-Settlement (Every 30 Minutes)

**Cron job runs:**
```
vercel.json:
"schedule": "*/30 * * * *"
→ GET /api/settle-bets
```

**What it does:**
1. Finds all unsettled predictions placed in last 24 hours
2. Fetches closing odds for each (currently mock)
3. Calculates: `CLV = (1 / closing_odds) - (1 / odds_taken)`
4. Updates DB with: `closing_odds`, `clv`, `result`, `settled_at`

**Current mock implementation:**
```typescript
// /src/app/api/settle-bets/route.ts
const closingOdds = (bet.odds_taken || 1.5) * (0.85 + Math.random() * 0.3);
```

### Step 3: Dashboard Refreshes

**Stats endpoint recalculates:**
```
/api/predictions/stats
→ AVG(clv) from settled predictions
→ COUNT(clv > 0) / total
```

**Dashboard shows:**
- Total predictions: 250
- Settled predictions: 187
- CLV: +0.48% (avg)
- % beating market: 52.4%
- Sample size: 187

---

## 📈 Understanding CLV Metrics

### Average CLV
```
Sum of all CLV / Count of settled predictions

Good: > 0% (on average you beat market)
Great: > 0.5% (statistically significant edge)
Exceptional: > 1% (strong edge)
```

### % Beating Market (Hit Rate on Closing)
```
Count(CLV > 0) / Total settled

Good: > 50% (more right than wrong)
Great: > 55% (consistently right)
Strong: > 60% (very consistent edge)
```

### Calibration
```
Avg(model_probability) - (Win % / 100)

Good: < 0.05 (model calibrated correctly)
Bad: > 0.15 (model overestimating probabilities)
```

---

## 🔄 14-Day Validation Protocol

### Days 1-3: Setup Phase
- ✅ System running
- ✅ Predictions flowing
- ✅ Settlement working
- ✅ Dashboard updating
- 📊 Expect: Noisy metrics, small sample

### Days 4-10: Gathering Phase
- 📈 Sample size growing (target: 100-150 bets)
- 📊 CLV averaging out
- 🔄 Pattern emerging
- 🎯 Look for: CLV staying positive or trending up

### Days 11-14: Decision Phase
- 🎯 Final metrics with 200+ bets
- ✅ All checks:
  - CLV > +0.5%?
  - % beating market > 55%?
  - Calibration error < 5%?
  - Sample size > 200?
- 🚨 If ALL YES → Edge is real → Deploy capital
- ❌ If ANY NO → Back to research

---

## 🚀 Next Step: Real Closing Odds

### Current Setup (Mock)
```typescript
// Random variance ±5-15%
const closingOdds = odds_taken * (0.85 + Math.random() * 0.3);
```

### Real Implementation Options

#### Option 1: TheOddsAPI
```typescript
const response = await fetch(
  `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${key}`
);
const data = await response.json();
const closingOdds = data.closing_odds;
```

#### Option 2: Betfair Exchange (Best for closing)
```typescript
const session = await betfairAPI.login();
const prices = await betfairAPI.getMarketPrices(marketId);
const closingPrice = prices[prices.length - 1]; // Last price before kick-off
```

#### Option 3: Manual Update (Testing Phase)
```
Daily:
- You check odds 30 min before kick-off
- Manual POST to /api/update-closing-odds
- Done until you automate
```

---

## 🧪 Testing the System

### Local Test

**1. Add test predictions:**
```bash
npx ts-node scripts/send-predictions.ts
```

**2. Manually trigger settlement:**
```bash
curl http://localhost:3000/api/settle-bets
```

**3. Check results:**
```
GET /api/predictions/stats

{
  "total": 5,
  "settled": 5,
  "avgCLV": 0.0045,
  "positiveCLVPercent": 60
}
```

**4. View dashboard:**
```
http://localhost:3000/dashboard/validation
```

---

## ⚠️ Important Rules

### 1. Never Overwrite `odds_taken`
```
❌ WRONG: Modify odds_taken after placement
✅ RIGHT: Only write closing_odds after event
```

### 2. Only Settle After Kickoff
```
❌ WRONG: Settle before event starts (closing odds not final)
✅ RIGHT: Settle 30-60 min after kickoff
```

### 3. Missing Closing Odds → Skip
```
❌ WRONG: Guess or estimate closing odds
✅ RIGHT: Leave NULL if unavailable
```

### 4. Don't Touch CLV During 14 Days
```
❌ WRONG: Adjust model because CLV looks bad
✅ RIGHT: Let it settle, observe, then decide Day 14
```

---

## 📊 Example: Good CLV

After 250 predictions over 10 days:

```
✅ Total: 250
✅ Settled: 237
✅ Avg CLV: +0.58%
✅ % beating market: 57.8%
✅ Calibration error: 2.1%
✅ Sample size: 237
```

**Interpretation:**
- Model finds inefficiencies
- Market converges toward model
- Edge is REAL and consistent
- Recommendation: **DEPLOY CAPITAL**

---

## 📊 Example: Bad CLV

After 150 predictions over 10 days:

```
❌ Total: 150
❌ Settled: 143
❌ Avg CLV: -0.12%
❌ % beating market: 47%
❌ Calibration error: 12%
❌ Sample size: 143
```

**Interpretation:**
- Market diverging from model
- You're not finding inefficiencies
- Model overconfident in probabilities
- Recommendation: **GO BACK TO RESEARCH**

---

## 🎯 Success Criteria (Day 14 Decision)

### To Approve Edge
```
AND (
  CLV > 0.5%,
  beaten_market_pct > 55%,
  calibration_error < 5%,
  sample_size > 200
)
```

---

## 🔧 Configuration

**Settle frequency:**
```json
// vercel.json
"schedule": "*/30 * * * *"  // Every 30 minutes
```

**Sample lookback:**
```typescript
// /api/settle-bets
.gt('placed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
// Settle predictions from last 24 hours
```

**Batch size:**
```typescript
.limit(100)  // Max 100 per run (prevents timeout)
```

---

## 📋 Checklist

- ✅ `/api/settle-bets` endpoint exists
- ✅ Cron configured in `vercel.json`
- ✅ Database schema has `closing_odds`, `clv`, `settled_at`
- ✅ Dashboard shows CLV metrics
- ✅ Stats endpoint calculates real CLV
- ⏳ Mock closing odds fetching (replace with real API)
- ⏳ Mock result calculation (replace with real results)
- ⏳ Connect to real odds source (TheOddsAPI, Betfair, etc.)

---

## 🚀 Next Level (After 14 Days)

### If Edge Confirmed

**Upgrade to:**
1. Real odds API connection
2. Capital allocation (Kelly criterion)
3. Multi-market tracking
4. Live hedge execution
5. Risk limits

### If Edge Not Confirmed

**Iterate:**
1. Review model assumptions
2. Backtest on larger sample
3. Add features (xG, recent form, etc.)
4. Return to research phase

---

## 📞 Support

**Questions:**
- How to add real odds API? → See "Real Closing Odds" section
- Dashboard not updating? → Check `/api/settle-bets` logs
- CLV always negative? → Model overconfident (calibration issue)
- Settlement failing? → Check Supabase connection

---

**Status:** ✅ System ready for real data
**Next:** Run 14-day validation
**Timeline:** April 3 → April 17 (decision point)
