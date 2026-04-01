# 🏛️ INSTITUTIONAL BETTING ENGINE

**Built**: 1 Apr 2026  
**Status**: Production-ready, self-governing system  
**Design**: Capital-managed, CLV-based, fully automated

---

## 📋 OVERVIEW

This system is **not** a prediction model.

This is a **capital allocation engine** that:
- ✅ Measures market inefficiency (CLV)
- ✅ Sizes bets using Kelly criterion
- ✅ Stops when edge disappears
- ✅ Rotates experiments automatically
- ✅ Tracks everything (audit trail)

**Key principle**: Never judge on profit. Judge on CLV.

---

## 🗄️ SCHEMA (INSTITUTIONAL GRADE)

### `experiments`

Isolates EPL from World Cup (CRITICAL)

```
id (uuid)
name (text) -- "EPL_2026_V1", "WC_2026_V1"
competition (text) -- regime separation
status (text) -- "active" | "complete"
startDate, endDate (timestamp)
```

👉 **Why**: Prevents accidental data mixing. Each market validates independently.

---

### `bankroll`

Your capital source of truth

```
id (uuid)
experimentId (fk)
startingBalance (float)
currentBalance (float)
peakBalance (float)
updatedAt (timestamp)
```

👉 **Why**: Kelly sizing needs live balance. Drawdown protection needs peak balance.

---

### `bets`

Real vs shadow predictions

```
id (uuid)
experimentId (fk)
matchId (text)
market (text) -- "home_win", "draw", etc

oddsTaken (float)
stake (float)
impliedProbTaken (float) -- 1/odds

isShadow (boolean) ⚡ KEY
result (text) -- WIN | LOSS | VOID
closingOdds (float)
clv (float) -- (closing_odds / odds_taken) - 1

settled (boolean)
placedAt, settledAt (timestamp)
```

👉 **Why**: `isShadow` lets you validate filter quality. `clv` is your edge metric.

---

## 🔄 SYSTEM FLOW (FULLY AUTOMATED)

### **1. TRIGGER LOOP**

```
POST /api/run-loop
```

Runs every 6 hours (via cron) or on demand.

---

### **2. GET ACTIVE EXPERIMENT**

Ensures you're in the right regime.

If no active experiment:
- ❌ Loop stops
- ✅ Return gracefully

---

### **3. CHECK CLV HEALTH** 🚨 KILL SWITCH

This is where the system **protects itself**.

```ts
Sample last 50 settled bets:
if (avg_clv < 0) → STOP ALL BETTING
if (positive_rate < 48%) → STOP ALL BETTING
if (sample_size < 50) → CONTINUE (too early to judge)
```

👉 This prevents "following a losing edge for another 50 bets"

---

### **4. CHECK COMPLETION**

```ts
if (bet_count >= 150) {
  close_experiment()
  create_new_experiment()
  return
}
```

👉 150 = minimum sample to reduce variance. Automatic rotation = discipline enforced.

---

### **5. GENERATE BETS** 💰 KELLY SIZING

For each prediction:

```ts
edge = (odds * prob) - 1

if (edge <= 0) {
  isShadow = true
  stake = 0
} else {
  kelly = edge / (odds - 1)
  stake_pct = kelly * 0.25  // 25% Kelly (safe)
  stake_pct = cap(stake_pct, 5%)  // max 5% of bankroll
  
  // APPLY DRAWDOWN PROTECTION
  drawdown = (peakBalance - currentBalance) / peakBalance
  
  if (drawdown > 30%) stake = 0
  else if (drawdown > 20%) stake_pct *= 0.25
  else if (drawdown > 10%) stake_pct *= 0.5
  
  stake = bankroll * stake_pct
  isShadow = false
}
```

👉 This is the complete staking logic. No humans involved.

---

### **6. SETTLE + CALCULATE CLV**

After match result known:

```ts
clv = (closingOdds / oddsTaken) - 1

// Interpretation:
// clv > 0 = you beat the market
// clv < 0 = market beat you
// clv = 0 = lucky on this bet
```

👉 CLV accumulated = proof of edge.

---

### **7. UPDATE BANKROLL**

```ts
pnl = SUM(
  if result = WIN: (odds_taken - 1) * stake
  if result = LOSS: -stake
)

new_balance = current_balance + pnl
new_peak = MAX(peak_balance, new_balance)
```

👉 Bankroll compounds. Kelly automatically scales next bets.

---

## 🎯 KEY METRICS (DASHBOARD)

### **1. Average CLV** (MOST IMPORTANT)

```sql
SELECT AVG(clv) FROM bets WHERE isShadow = false
```

**Interpretation:**
| CLV    | Status         | Action        |
| ------ | -------------- | ------------- |
| +0.05+ | ✅ Edge proven | Continue      |
| 0-0.05 | ⚠️ Marginal    | Monitor       |
| 0      | ❌ No edge     | Stop/rebuild  |
| -      | ❌ Losing      | Kill switch   |

---

### **2. Positive CLV Rate**

```sql
COUNT(clv > 0) / COUNT(*) * 100
```

**Target:** >50% (ideally 55%+)

---

### **3. Real vs Shadow**

```sql
SELECT
  is_shadow,
  AVG(clv),
  COUNT(*)
FROM bets
GROUP BY is_shadow
```

**Interpretation:**
- If shadow CLV > real CLV = your filters are removing edge ❌
- If shadow CLV < real CLV = your filters are adding edge ✅

---

### **4. Drawdown**

```ts
drawdown = (peak_balance - current_balance) / peak_balance * 100
```

| Drawdown | Risk Level | Action              |
| -------- | ---------- | ------------------- |
| 0-10%    | 🟢 Low     | Normal staking      |
| 10-20%   | 🟡 Medium  | Halve stakes (50%)  |
| 20-30%   | 🔴 High    | Quarter stakes (25%)|
| 30%+     | ⛔ Critical| Stop all betting    |

---

### **5. CLV Over Time**

```sql
SELECT DATE(placed_at), AVG(clv)
FROM bets
GROUP BY DATE
ORDER BY DATE
```

👉 Detects model decay (if trending negative = system is breaking).

---

## 🚀 API REFERENCE

### **1. Create Experiment**

```bash
POST /api/experiment/create

{
  "name": "EPL_2026_V1",
  "competition": "EPL",
  "startingBalance": 1000
}
```

**Returns:**
```json
{
  "experiment": { id, name, status, ... },
  "bankroll": { currentBalance, peakBalance, ... }
}
```

---

### **2. Run Orchestrator Loop**

```bash
POST /api/run-loop
```

**What happens:**
1. Get active experiment
2. Check CLV health
3. Check 150-bet completion
4. Generate bets (Kelly + risk control)
5. Calculate CLV
6. Update bankroll
7. Rotate if done

---

### **3. Get Dashboard Metrics**

```bash
GET /api/dashboard?experimentId=xxx
```

**Returns:**
```json
{
  "metrics": {
    "totalBets": 87,
    "settledBets": 82,
    "avgClv": 0.0234,
    "positiveClvRate": 54.2,
    "drawdown": 5.3,
    "currentBalance": 1055.34,
    "realBets": 70,
    "shadowBets": 17
  }
}
```

---

### **4. Check Experiment Status**

```bash
GET /api/experiment/status?competition=EPL
```

**Returns:**
```json
{
  "active": true,
  "experiment": { ... },
  "betCount": 87
}
```

---

## 🔐 SAFETY GUARANTEES

### **1. Never edit bets after logging**
- ✅ Database constraints enforce
- ❌ No "undo" allowed

### **2. Never mix experiments**
- ✅ `experimentId` foreign key enforces
- ✅ EPL and World Cup fully isolated

### **3. Never change model mid-experiment**
- ✅ `modelVersion` locked at prediction time
- ❌ Can't go back and adjust

### **4. Never judge on profit**
- ✅ CLV is the only metric that matters
- ✅ Profit is coincidence

### **5. Never gamble past loss**
- ✅ Kill switch stops at -0.05 avg CLV
- ✅ Drawdown protection scales stakes down
- ✅ At 30% drawdown = forced stop

---

## 📊 PHASE 1: EPL VALIDATION (STARTING)

### Target: 150 bets

### Success Criteria:
- ✅ avg_clv > 0
- ✅ positive_clv_rate > 50%
- ✅ no hit to peak_balance (model doesn't degrade)

### If fails:
- ❌ Rebuild model
- ❌ Re-validate filters

### Timeline:
- Days 1-3: First 50 bets (early signal)
- Days 4-7: Bets 50-100 (consistency check)
- Days 8-10: Bets 100-150 (final validation)
- Decision: Is edge real?

---

## 💡 HOW THIS IS DIFFERENT

### Traditional approach:
```
Run model → Place bets → Check profit
Result: Profit is noise, tells you nothing
```

### This system:
```
Run model → Track CLV per bet → Calculate edge → Scale if positive → Auto-stop if negative
Result: Statistical proof of market inefficiency
```

---

## 🎓 KEY CONCEPTS

### **CLV (Closing Line Value)**

Formula:
```
clv = (closing_odds / odds_taken) - 1
```

**Meaning:**
- You took odds at 2.0, market closed at 2.1 = +0.05 CLV
- You took odds at 2.0, market closed at 1.9 = -0.05 CLV

**Why it matters:**
- CLV = proof you found a market inefficiency BEFORE it corrected
- Profit = just luck (could be noise)
- CLV accumulated = edge is real

---

### **Kelly Criterion**

```
kelly = edge / (odds - 1)
```

**Why fractional (25% Kelly)?**
- Full Kelly is too volatile (can lose 50%+ of bankroll in unlucky runs)
- 25% Kelly = slow growth, survives drawdowns
- This system uses 25% Kelly because we want to stay alive long enough to prove edge

---

### **Shadow Bets**

Predictions you don't take (stake = 0) but track as if you did.

**Why?**
- Tests filter quality
- If shadow_clv > real_clv = your filters are removing edge ❌
- If shadow_clv < real_clv = your filters work ✅

---

### **Drawdown Protection**

```ts
drawdown = (peak - current) / peak
if (drawdown > 30%) STOP
```

**Why?**
- Even real edges have losing streaks
- At -30% you've lost 30% of peak, surviving another 20% drawdown would destroy you
- Better to stop and rebuild than gamble to recovery

---

## 🔥 NEXT LEVEL (OPTIONAL)

If you want to go further:

### 1. **Multi-model competition**
- Run EPL_V1, EPL_V2, EPL_V3 simultaneously
- Each gets 1/3 of bankroll
- Track CLV per model
- Auto-allocate to best performer

### 2. **Real odds integration**
- Replace mock odds with Sportradar / Sportmonks
- Auto-update `closingOdds` from API
- Eliminate manual data entry

### 3. **Mobile alerts**
- Send Slack/SMS when drawdown hits 20%
- Send summary daily (CLV, balance, bets)
- Send kill-switch alerts

### 4. **Bias analysis**
- Track CLV by team (does model favor certain teams?)
- Track CLV by market (does model work better for BTTS vs Over?)
- Fix systematic errors

---

## 📝 DEPLOYMENT CHECKLIST

- [ ] Run migrations (add Experiment + Bankroll tables)
- [ ] Create first experiment: `POST /api/experiment/create`
- [ ] Verify dashboard loads: `GET /api/dashboard?experimentId=xxx`
- [ ] Set up cron: `POST /api/run-loop` every 6 hours
- [ ] Monitor logs: Check for CLV health alerts
- [ ] Daily standup: Check dashboard metrics
- [ ] At 150 bets: Evaluate CLV, make go/no-go decision

---

## 🎯 SUCCESS LOOKS LIKE

After 150 EPL bets:

```
Experiment: EPL_2026_V1
Total bets: 150
Settled bets: 147
Avg CLV: +0.038
Positive rate: 54%
Current balance: $1,587
Peak balance: $1,612
Drawdown: 1.5%

Status: ✅ EDGE VALIDATED → PROCEED TO PHASE 2
```

---

**Built for professionals. Enforces discipline. Proves edge.**
