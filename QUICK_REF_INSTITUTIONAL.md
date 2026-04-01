# ⚡ INSTITUTIONAL ENGINE: QUICK REFERENCE

**Copy-paste commands. Execute in 5 minutes.**

---

## 🚀 DEPLOY

```bash
# 1. Apply schema
npm run prisma migrate dev --name "institutional_engine"

# 2. Create first experiment
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{
    "name":"EPL_2026_V1",
    "competition":"EPL",
    "startingBalance":1000
  }'

# 3. Save experiment ID (you'll use this everywhere)
EXPERIMENT_ID="550e8400-e29b-41d4-a716-446655440000"
```

---

## 📊 DAILY CHECKS (5 MIN)

### Check 1: Is system healthy?
```bash
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID"

# Look for:
# - avgClv > 0 ✅
# - drawdown < 10% ✅
# - positiveClvRate > 50% ✅
```

### Check 2: Is edge real? (Advanced)
```bash
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId":"'$EXPERIMENT_ID'",
    "query":"clv-health"
  }'

# If avgClv < 0 → SYSTEM HALTS (kill switch)
# If positiveRate < 48% → SYSTEM HALTS
```

### Check 3: Is drawdown manageable?
```bash
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId":"'$EXPERIMENT_ID'",
    "query":"drawdown-status"
  }'

# 0-10% = 🟢 normal
# 10-20% = 🟡 caution
# 20-30% = 🔴 severe
# >30% = ❌ STOP (forced)
```

---

## 🎯 METRICS YOU NEED TO KNOW

| Metric | Good | Bad | Critical |
| ------ | ---- | --- | -------- |
| **avg_clv** | > +0.05 | 0 to -0.05 | < 0 → STOP |
| **positive_rate** | > 54% | 48-54% | < 48% → STOP |
| **drawdown** | < 10% | 10-20% | > 30% → STOP |
| **sample_size** | > 50 | 20-50 | < 20 (too early) |

---

## 💰 KELLY STAKING (AUTOMATIC)

You don't calculate this. The system does:

```
edge = (odds * prob) - 1

if edge > 0:
  kelly_stake = edge / (odds - 1) * 0.25  # 25% Kelly
  kelly_stake = min(kelly_stake, 5%)       # cap 5%
  
  # Apply drawdown protection
  if drawdown > 30%: stake = 0
  else if drawdown > 20%: stake *= 0.25
  else if drawdown > 10%: stake *= 0.5
  
  final_stake = bankroll * kelly_stake
else:
  stake = 0  # shadow bet
```

**Result**: Bets automatically scale down during losses.

---

## 🔄 WHAT HAPPENS WHEN YOU CALL `/api/run-loop`

```
1. ✓ Get active experiment (EPL_2026_V1)
2. ✓ Check CLV health (kill switch)
3. ✓ Check if 150 bets reached (if yes → rotate)
4. ✓ Generate bets (Kelly sizing)
5. ✓ Calculate CLV (after results)
6. ✓ Update bankroll (compound growth)
```

**Time**: ~5 seconds  
**Run every**: 6 hours (via cron)

---

## 🚨 KILL SWITCHES (AUTO STOP)

System stops betting if ANY condition triggers:

```sql
-- Check 1: CLV goes negative
SELECT AVG(clv) FROM bets WHERE experiment_id = ? AND is_shadow = false
→ If < 0: STOP

-- Check 2: Win rate drops below 48%
SELECT COUNT(*) FILTER (WHERE clv > 0) / COUNT(*) FROM bets
→ If < 0.48: STOP

-- Check 3: Drawdown exceeds 30%
SELECT (peak_balance - current_balance) / peak_balance FROM bankroll
→ If > 0.30: STOP
```

**You don't control this. The system enforces it.**

---

## 📈 EXPERIMENT PHASES

### Phase 1: EPL Validation
- **Bets**: 150
- **Success**: avg_clv > 0 AND positive_rate > 50%
- **Timeline**: ~10 days
- **Next**: Phase 2 if success, rebuild if fail

### Phase 2: EPL Confirmation
- **Bets**: 50
- **Purpose**: Verify Phase 1 wasn't luck
- **Success**: Same metrics hold
- **Next**: Phase 3 (World Cup prep)

### Phase 3: World Cup Prep
- **Duration**: 1 week
- **Purpose**: Set up separate bankroll
- **Next**: Phase 4 (World Cup validation)

### Phase 4: World Cup Validation
- **Bets**: 150
- **Purpose**: Test if edge transfers to new market
- **Success**: Same CLV metrics
- **Next**: Phase 5 if both markets validated

### Phase 5: Scale Decision
- **Question**: Scale EPL + World Cup simultaneously?
- **Decision**: Only if both have positive CLV
- **Action**: Allocate bankroll proportionally

---

## 🔍 REAL VS SHADOW BETS

```
Real bets: isShadow = false, stake > 0
Shadow bets: isShadow = true, stake = 0

Shadow bets validate your filters:
- If shadow_clv > real_clv = filters remove edge ❌
- If shadow_clv < real_clv = filters work ✅

Query:
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId":"'$EXPERIMENT_ID'",
    "query":"real-vs-shadow"
  }'
```

---

## 📊 ADVANCED QUERIES

```bash
# CLV trend (detect decay)
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"clv-trend"}'

# Market breakdown (does model work for all markets?)
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"market-breakdown"}'

# Odds analysis (does model favor short or long odds?)
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"odds-analysis"}'

# Win/loss ratio
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"win-loss-ratio"}'
```

---

## 🎯 DECISION TREE

```
Day 1-3 (50 bets):
├─ avg_clv > 0? 
│  ├─ YES → Continue
│  └─ NO → Watch closely
└─ Drawdown < 10%?
   ├─ YES → Normal
   └─ NO → Reduce stakes manually

Day 4-7 (100 bets):
├─ avg_clv still > 0?
│  ├─ YES → Continue
│  └─ NO → Question model
└─ Trending positive?
   ├─ YES → Good sign
   └─ NO → Model decay

Day 8-10 (150 bets):
├─ avg_clv > 0 AND positive_rate > 50%?
│  ├─ YES → ✅ PASS PHASE 1
│  └─ NO → ❌ FAIL PHASE 1
├─ If PASS:
│  └─ Move to Phase 2 (50-bet confirmation)
└─ If FAIL:
   └─ Stop, rebuild model, restart
```

---

## 🔧 TROUBLESHOOTING

**Q: Dashboard shows "total_bets: 0"**
```
A: No bets placed yet. Run /api/run-loop manually first.
```

**Q: avg_clv is very small (0.001)**
```
A: Too early. Need minimum 50 settled bets. Wait.
```

**Q: Drawdown hit 30% and bets stopped**
```
A: KILL SWITCH activated. Model broke. Analyze what went wrong.
```

**Q: Shadow bets have better CLV than real bets**
```
A: Your filters are removing edge. Recalibrate thresholds.
```

**Q: "No active experiment found"**
```
A: Create one: POST /api/experiment/create
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Schema migrated: `npm run prisma migrate dev`
- [ ] Experiment created: `POST /api/experiment/create`
- [ ] Dashboard works: `GET /api/dashboard?experimentId=XXX`
- [ ] Run loop works: `POST /api/run-loop`
- [ ] Cron configured: `vercel.json` has /api/run-loop
- [ ] Monitoring set up: Daily check dashboard
- [ ] Kill switches verified: System stops at -CLV/drawdown
- [ ] Ready for Phase 1: All green

---

## 📞 ONE-LINER HELP

```bash
# Is system healthy right now?
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" | jq '.metrics'

# What's today's CLV?
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"clv-trend"}' | jq '.result[-1]'

# Is drawdown safe?
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"drawdown-status"}' | jq '.result.riskLevel'

# Trigger loop right now
curl -X POST http://localhost:3000/api/run-loop

# Everything at once
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" && \
curl -X POST http://localhost:3000/api/run-loop && \
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"clv-health"}'
```

---

**When avg_clv > 0 and positive_rate > 50%, you've proven edge.**

**When you've proven it 3x (Phase 1 + 2 + 4), you scale.**

**That's it. That's the system.**

✅ Ready to launch Phase 1?
