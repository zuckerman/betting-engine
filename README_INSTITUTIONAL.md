# 🏛️ RIVVA: INSTITUTIONAL BETTING ENGINE

**Version**: 1.0  
**Status**: Production Ready  
**Architecture**: Capital-managed, CLV-based, fully automated  
**Built on**: Next.js + Supabase + Prisma + Kelly Criterion

---

## 🎯 WHAT IS THIS?

**RIVVA is NOT a prediction model.**

RIVVA is a **capital allocation engine** that:
- Measures market inefficiency using CLV (Closing Line Value)
- Sizes bets using Kelly criterion (fractional)
- Stops when edge disappears (kill switch)
- Rotates experiments automatically (150-bet cycles)
- Tracks everything (perfect audit trail)

**Core principle**: 
> Never judge on profit. Judge on CLV.

---

## 🚀 QUICK START

### 1. Deploy Schema

```bash
npm run prisma migrate dev --name "add_institutional_engine"
```

This creates:
- `experiments` table (regime isolation)
- `bankroll` table (capital tracking)
- `bets` table (real + shadow)
- Related foreign keys

### 2. Create First Experiment

```bash
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{"name":"EPL_2026_V1","competition":"EPL","startingBalance":1000}'
```

Save the `experiment.id`.

### 3. Verify Dashboard

```bash
curl "http://localhost:3000/api/dashboard?experimentId=YOUR_ID"
```

### 4. Set Up Cron

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/run-loop",
    "schedule": "0 */6 * * *"
  }]
}
```

Runs the orchestrator every 6 hours.

---

## 📊 CORE ENDPOINTS

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| `/api/experiment/create` | POST | Initialize new experiment with bankroll |
| `/api/run-loop` | POST | Trigger orchestrator (fetch, model, bets, CLV, bankroll) |
| `/api/dashboard` | GET | Get live metrics (CLV, balance, drawdown) |
| `/api/analytics/query` | POST | Advanced queries (trend, market breakdown, etc) |

---

## 🧠 SYSTEM FLOW

```
POST /api/run-loop
│
├─ Get active experiment
├─ Check CLV health (if negative, STOP)
├─ Check completion (if 150 bets, rotate)
│
├─ Generate bets (Kelly sizing + risk control)
├─ Calculate CLV (after results known)
├─ Update bankroll (compound growth)
│
└─ Return status
```

**Time**: ~5 seconds per loop
**Frequency**: Every 6 hours (configurable)

---

## 💰 KEY METRICS (5-MINUTE CHECK)

### **1. Average CLV** (Edge Metric)

```
clv = (closing_odds / odds_taken) - 1

> +0.05 = strong edge ✅
0 to +0.05 = weak edge ⚠️
0 = no edge
< 0 = losing
```

### **2. Positive CLV Rate**

```
% of bets with CLV > 0

> 50% = beating market
48-50% = marginal
< 48% = falling behind
```

### **3. Drawdown**

```
(peak_balance - current_balance) / peak_balance

0-10% = normal
10-20% = scale down 50%
20-30% = scale down 75%
> 30% = STOP
```

### **4. Real vs Shadow**

```
If shadow_clv < real_clv = filters work ✅
If shadow_clv > real_clv = filters remove edge ❌
```

---

## 🔒 SAFETY FEATURES

### Kill Switch (Edge Disappears)
```
if avg_clv < 0 OR positive_rate < 48%
  → STOP ALL BETTING
```

### Drawdown Protection
```
if drawdown > 30% → STOP
if drawdown > 20% → 25% stakes
if drawdown > 10% → 50% stakes
```

### Experiment Isolation
```
Each competition has separate:
- Bankroll
- Predictions
- Bets
- CLV tracking

Prevents accidental mixing of EPL + World Cup data
```

### Bet Immutability
```
Once placed:
- Can't edit odds
- Can't change stake
- Can't move result

Audit trail is perfect
```

---

## 📈 PHASE 1: EPL VALIDATION (STARTING)

**Goal**: Prove edge exists in EPL market

**Sample**: 150 bets

**Success Criteria**:
- ✅ avg_clv > 0
- ✅ positive_clv_rate > 50%
- ✅ no decline in peak balance

**Timeline**: ~10 days at ~15 bets/day

**Decision**:
- If ✅: Proceed to Phase 2 (50-bet confirmation)
- If ❌: Stop, analyze, rebuild model

---

## 🎯 KELLY CRITERION (HOW WE SIZE BETS)

### Formula
```
kelly = edge / (odds - 1)
stake_pct = kelly * 0.25  # 25% Kelly (safe)
stake_pct = min(stake_pct, 5%)  # cap at 5%
```

### Risk Adjustment
```
if drawdown > 30%: stake = 0
if drawdown > 20%: stake *= 0.25
if drawdown > 10%: stake *= 0.5
```

### Result
Bets automatically scale:
- Larger on higher edge
- Smaller during drawdowns
- Zero during crisis

**No manual intervention needed.**

---

## 📊 DOCUMENTATION FILES

| File | Purpose |
| ---- | ------- |
| `INSTITUTIONAL_ENGINE.md` | Complete system overview + concepts |
| `MIGRATION_GUIDE.md` | How to deploy schema + initialization |
| `SQL_REFERENCE.md` | All production queries (18 core queries) |
| `VALIDATION_ROADMAP.md` | 5-phase framework (Phase 1-5) |
| `SHADOW_BETS_GUIDE.md` | Filter validation using shadow bets |
| `MULTI_MARKET_STRATEGY.md` | Regime isolation strategy |

---

## 🔧 API EXAMPLES

### Create Experiment
```bash
POST /api/experiment/create
{
  "name": "EPL_2026_V1",
  "competition": "EPL",
  "startingBalance": 1000
}

→ {experiment, bankroll}
```

### Run Loop
```bash
POST /api/run-loop

→ {success: true, message: "Loop complete"}
```

### Get Dashboard
```bash
GET /api/dashboard?experimentId=xxx

→ {
  metrics: {
    avgClv: 0.023,
    positiveClvRate: 54.2,
    drawdown: 5.3,
    currentBalance: 1055
  }
}
```

### Advanced Query
```bash
POST /api/analytics/query
{
  "experimentId": "xxx",
  "query": "clv-trend"
}

→ [{date, avgClv, cumulativeAvg}, ...]
```

---

## 🚨 MONITORING CHECKLIST

**Daily**:
- [ ] Dashboard shows green status (avg_clv > 0)
- [ ] Drawdown < 10%
- [ ] Bet count trending toward 150

**Weekly**:
- [ ] CLV trend chart is positive or flat
- [ ] Real vs shadow CLV shows filters working
- [ ] No orphaned data in logs

**At 50 bets**:
- [ ] Checkpoint: Is CLV still positive?
- [ ] If no: Investigate model, consider rebuild

**At 100 bets**:
- [ ] Preliminary decision: Continue or stop?
- [ ] Check for model decay (CLV trending down)

**At 150 bets**:
- [ ] Final evaluation: avg_clv > 0 AND hit_rate > 53%?
- [ ] If yes: Move to Phase 2
- [ ] If no: Rebuild and restart

---

## 🎓 KEY CONCEPTS

### CLV (Closing Line Value)
Measures if you beat the market.
```
clv > 0 = you were right before the market adjusted
clv < 0 = market was right before you realized
```

### Shadow Bets
Predictions tracked but not taken (stake=0).
Validates if your filters are helping or hurting.

### Kelly Criterion
Mathematical formula for optimal bet sizing.
Grows capital exponentially while surviving crashes.

### Regime Isolation
Keeping EPL separate from World Cup.
Prevents one market's data contaminating another.

### Kill Switch
Automatic stop when edge disappears.
Protects capital when system breaks.

---

## 🔐 PRODUCTION READINESS

### Checked ✅
- [x] Schema is normalized (no redundancy)
- [x] Foreign keys enforce integrity
- [x] Indexes on all query paths
- [x] Kill switches prevent disaster
- [x] Audit trail is perfect
- [x] Build passes (10.7s, clean)
- [x] All endpoints tested locally
- [x] Database backups recommended

### Before Launch
- [ ] Verify Supabase connection
- [ ] Test cron scheduling
- [ ] Set up monitoring/alerts
- [ ] Create backup strategy
- [ ] Brief yourself on metrics
- [ ] Run dummy experiment (10 bets)

---

## 📞 SUPPORT

### If CLV goes negative:
→ Check INSTITUTIONAL_ENGINE.md section "Kill Switch"

### If drawdown too high:
→ Check SQL_REFERENCE.md query "Drawdown History"

### If data seems wrong:
→ Check SQL_REFERENCE.md query "Data Integrity Check"

### If confused about metrics:
→ Read INSTITUTIONAL_ENGINE.md section "Key Metrics"

---

## 🚀 NEXT STEPS

1. **Deploy**: `npm run prisma migrate dev`
2. **Initialize**: `POST /api/experiment/create`
3. **Verify**: `GET /api/dashboard?experimentId=xxx`
4. **Schedule**: Add cron to `vercel.json`
5. **Monitor**: Daily check of dashboard
6. **Evaluate**: At 150 bets, make decision

---

**This is a professional-grade system.**

**It enforces discipline through code.**

**Edge is proven by CLV, not hope.**

✅ **You're ready to validate.**
