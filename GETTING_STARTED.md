# 🎬 GETTING STARTED: INSTITUTIONAL ENGINE

**Read this first. It's 10 minutes to production.**

---

## 📍 WHERE YOU ARE

You have:
- ✅ SaaS platform (auth, payments, signal gating working)
- ✅ Multi-market schema (competition + season fields)
- ✅ Shadow bets infrastructure
- ✅ Production build (10.7s, clean)

You're about to:
- 🚀 Add institutional capital management layer
- 📊 Implement CLV-based validation
- 🔐 Lock in safety (kill switches, risk controls)
- 🎯 Start Phase 1 EPL validation

---

## 🔧 SETUP (5 MINUTES)

### Step 1: Read the Architecture

Open and skim: **INSTITUTIONAL_ENGINE.md**

Key sections:
- "SYSTEM FLOW" (how it works)
- "KEY METRICS" (what matters)
- "SAFETY GUARANTEES" (what can't break)

**Time**: 5 min. Purpose: Understand the concept.

---

### Step 2: Deploy Schema

```bash
cd /Users/williamtyler-street/Rivva

# Generate migration
npm run prisma migrate dev --name "institutional_engine"

# This creates:
# - experiments table (regime isolation)
# - bankroll table (capital tracking)
# - bets table (real + shadow predictions)
# - Foreign keys on predictions + daily_snapshot
```

**If migration fails**: Check MIGRATION_GUIDE.md troubleshooting section.

---

### Step 3: Initialize First Experiment

```bash
# Create EPL_2026_V1
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{
    "name":"EPL_2026_V1",
    "competition":"EPL",
    "startingBalance":1000
  }'

# Save the experiment ID from response
# You'll use it everywhere from now on
```

Expected response:
```json
{
  "success": true,
  "experiment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "EPL_2026_V1",
    "status": "active"
  },
  "bankroll": {
    "currentBalance": 1000,
    "peakBalance": 1000
  }
}
```

---

### Step 4: Verify Dashboard

```bash
# Test dashboard with your experiment ID
EXPERIMENT_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID"

# You should see:
# {
#   "metrics": {
#     "totalBets": 0,
#     "avgClv": 0,
#     "drawdown": 0,
#     "currentBalance": 1000
#   }
# }
```

✅ If this works, system is deployed.

---

### Step 5: Test Run Loop

```bash
# Trigger the orchestrator
curl -X POST http://localhost:3000/api/run-loop

# Should return:
# {"success": true}

# Check dashboard again - no errors means it ran
```

---

### Step 6: Configure Cron

In your `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/run-loop",
    "schedule": "0 */6 * * *"
  }]
}
```

Or if deploying locally, set up a scheduler for `/api/run-loop` every 6 hours.

---

## 📚 DOCUMENTATION ROADMAP

**Read in this order**:

1. **QUICK_REF_INSTITUTIONAL.md** (5 min)
   - Copy-paste commands
   - Metrics cheat sheet
   - Decision tree

2. **INSTITUTIONAL_ENGINE.md** (15 min)
   - Complete system overview
   - How CLV works
   - How Kelly works
   - Safety features

3. **MIGRATION_GUIDE.md** (5 min)
   - Deployment checklist
   - Troubleshooting
   - Data integrity validation

4. **SQL_REFERENCE.md** (10 min)
   - Production queries
   - Health checks
   - Custom analysis

5. **README_INSTITUTIONAL.md** (5 min)
   - API reference
   - Monitoring checklist
   - Next steps

---

## 🎯 YOUR FIRST DAY FLOW

### Morning (5 min)

```bash
# Check system health
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" | jq '.metrics'

# Look for:
# - "totalBets": should increase (if >0)
# - "avgClv": should be positive (or close to 0 if too early)
# - "drawdown": should be < 10%
```

### Noon (2 min)

```bash
# Trigger loop manually
curl -X POST http://localhost:3000/api/run-loop

# Check logs (if hosted locally)
tail -f .next/logs/api-run-loop.log
```

### Evening (5 min)

```bash
# Check again
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" | jq '.metrics'

# Document in DAILY_LOG.md
# (see template in DAILY_LOG.md)
```

---

## 📊 WHAT'S ACTUALLY HAPPENING

### The Loop (every 6 hours)

```
1. GET EXPERIMENT
   → Fetch active experiment (EPL_2026_V1)

2. CHECK CLV HEALTH
   → Last 50 settled bets
   → avg_clv > 0? positive_rate > 48%?
   → If no: STOP (kill switch)

3. CHECK COMPLETION
   → Bet count >= 150?
   → If yes: Create new experiment, copy template

4. GENERATE BETS
   → For each pending prediction
   → Calculate Kelly stake
   → Apply drawdown protection
   → Place real or shadow bet

5. CALCULATE CLV
   → For each settled bet
   → closing_odds / odds_taken - 1
   → This is your edge metric

6. UPDATE BANKROLL
   → Sum P&L from settled bets
   → Update current_balance + peak_balance
   → Kelly automatically scales next round
```

**Result**: 150 bets over ~10 days. Edge proven. Move to Phase 2.

---

## 🚨 CRITICAL NUMBERS

| Metric | OK | Danger | Critical |
| ------ | -- | ------ | -------- |
| **avg_clv** | > +0.01 | -0.01 to +0.01 | < -0.01 🛑 |
| **positive_clv_rate** | > 52% | 48-52% | < 48% 🛑 |
| **drawdown** | < 5% | 10-20% | > 30% 🛑 |
| **sample_size** | > 50 | 20-50 | < 20 (wait) |

🛑 = Kill switch triggers, system stops betting automatically

---

## 🔍 DAILY HEALTH CHECK (2 MIN)

```bash
# The one command to know system is healthy
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId":"'$EXPERIMENT_ID'",
    "query":"clv-health"
  }' | jq '.result'

# Should show:
# {
#   "avgClv": 0.0234,
#   "positiveRate": 54.2,
#   "sampleSize": 82,
#   "systemHealthy": true,
#   "status": "HEALTHY"
# }
```

---

## 🎯 PHASE 1 TIMELINE

### Days 1-3: First 50 Bets
- **What**: Early signal
- **Check**: Is CLV positive or negative early?
- **Action**: Monitor, no changes

### Days 4-7: 50-100 Bets
- **What**: Consistency check
- **Check**: Is CLV trend positive?
- **Action**: Continue or investigate

### Days 8-10: 100-150 Bets
- **What**: Final validation
- **Check**: avg_clv > 0 AND positive_rate > 50%?
- **Decision**: PASS (Phase 2) or FAIL (rebuild)

---

## ✅ GO/NO-GO CHECKLIST

Before launching into Phase 1:

- [ ] Schema migrated (no errors)
- [ ] First experiment created
- [ ] Dashboard returns metrics
- [ ] Run loop returns success
- [ ] Cron is configured
- [ ] You've read INSTITUTIONAL_ENGINE.md
- [ ] You understand CLV concept
- [ ] You understand Kelly concept
- [ ] You understand kill switches
- [ ] You understand Phase 1 success criteria

---

## 🚫 DON'T DO THESE THINGS

### During Phase 1
- ❌ **Don't change model thresholds** (mid-run)
- ❌ **Don't edit bets** (they're locked)
- ❌ **Don't mix EPL + World Cup data** (separate experiments)
- ❌ **Don't judge on profit** (judge on CLV)
- ❌ **Don't override kill switches** (they exist for reason)

### System Mechanics
- ❌ **Don't bypass CLV calculation** (it's automatic)
- ❌ **Don't manually set stakes** (Kelly does this)
- ❌ **Don't ignore drawdown warnings** (system auto-stops)

### Analysis
- ❌ **Don't cherry-pick metrics** (use all 5: CLV, win%, shadow, trend, health)
- ❌ **Don't blame luck for loss** (CLV tells truth)
- ❌ **Don't expect profit** (only expect edge proof)

---

## 💡 HOW TO THINK ABOUT THIS

### Traditional Betting
```
"I made $500 profit"
= Could be luck
= Could be systematic
= Unclear if edge exists
```

### Institutional Betting (This System)
```
"My avg CLV is +0.032"
= CLV > 0 means beating market
= CLV accumulated = statistically significant
= Edge is PROVEN
```

**That's the shift.** From "did I win?" to "is my edge real?"

---

## 🔧 IF SOMETHING BREAKS

### "Dashboard shows 0 bets"
Check: Has run loop been triggered?
Fix: `curl -X POST http://localhost:3000/api/run-loop`

### "avg_clv is very small (0.0001)"
Check: Sample size < 50?
Fix: Wait. Need minimum 50 settled bets to judge.

### "System says 'CLV negative → STOP'"
Check: What went wrong?
Fix: Review recent bets, model might have broken.
Action: Rebuild model, restart Phase 1.

### "Drawdown hit 30%"
Check: Kill switch activated?
Fix: Check logs, understand failure mode.
Action: System automatically stops bets.

### "I don't see any bets placed"
Check: Are predictions being generated?
Fix: Verify `/api/generate` endpoint is running.
Check: Are odds being sent to predictions?

---

## 📱 MONITOR LIKE A PRO

### Weekly Checks

**Monday**:
```bash
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" | jq '.metrics'
```
Log in DAILY_LOG.md.

**Wednesday**:
```bash
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"clv-trend"}'
```
Check if trending up or down.

**Friday**:
```bash
curl -X POST http://localhost:3000/api/analytics/query \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"real-vs-shadow"}'
```
Are filters working?

---

## 🎓 KEY CONCEPTS (TL;DR)

**CLV**: (closing_odds / odds_taken) - 1
- If > 0: You beat market ✅
- If < 0: Market beat you ❌
- Accumulated CLV = proof of edge

**Kelly**: Optimal bet sizing
- Formula: edge / (odds - 1)
- This system: 25% Kelly (safe)
- Result: Automatic scaling with edge

**Regime Isolation**: Keep EPL separate from World Cup
- Different markets = different models
- Mixing = false confidence
- Separating = honest validation

**Shadow Bets**: Predictions you don't take (stake=0)
- Validates filter quality
- Shows if filters help or hurt

**Kill Switch**: Automatic stop if system breaks
- avg_clv < 0 → STOP
- positive_rate < 48% → STOP
- drawdown > 30% → STOP

---

## 🚀 NOW WHAT?

### Right Now
1. Read QUICK_REF_INSTITUTIONAL.md (5 min)
2. Deploy schema and test (5 min)
3. Verify dashboard works (2 min)

### Tomorrow
1. Start Phase 1 monitoring
2. Daily dashboard check
3. Log observations

### After 150 bets (~10 days)
1. Evaluate: avg_clv > 0?
2. Decide: Phase 2 or rebuild?
3. Document: Why pass/fail

---

## 📞 QUICK COMMANDS

```bash
# Set your experiment ID
export EXPERIMENT_ID="your-id-here"

# Check health (daily)
curl "http://localhost:3000/api/dashboard?experimentId=$EXPERIMENT_ID" | jq '.metrics'

# Run loop (manual trigger)
curl -X POST http://localhost:3000/api/run-loop

# CLV trend (weekly)
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"clv-trend"}' | jq '.result'

# Real vs shadow (weekly)
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{"experimentId":"'$EXPERIMENT_ID'","query":"real-vs-shadow"}' | jq '.result'
```

---

## ✅ SUCCESS METRICS

After 150 EPL bets, you WIN if:
- ✅ avg_clv > 0 (beating market)
- ✅ positive_clv_rate > 50% (win rate > 50%)
- ✅ no decline in peak_balance (model didn't break)

If all three: **Proceed to Phase 2 (50-bet confirmation)**

If any fail: **Rebuild model, restart Phase 1**

---

**You now have a professional betting system.**

**It's designed to prove edge, not make money (though money follows).**

**Phase 1 starts now.**

✅ Ready? Let's go.
