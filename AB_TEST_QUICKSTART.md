# 🚀 START HERE: RUN THE A/B TEST SYSTEM

**Status:** Ready to validate

---

## ⚠️ CRITICAL FIRST STEP: DATABASE MIGRATION

Before you generate any signals, you MUST apply the database migration.

### Step 1: Get Migration SQL

```bash
cat migrations/add_versioning_and_bankroll.sql
```

### Step 2: Apply to Supabase

1. Go to: https://app.supabase.com
2. Select your project
3. Go to: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Paste the entire migration file
6. Click: **Run**

**You should see:** ✅ Query successful

This creates:
- Version fields on predictions table
- bankroll_state table (tracks compounding capital)
- open_bets_snapshot table (for exposure calculations)
- Indexes for fast queries

---

## 🎬 QUICK START: Run the A/B Test

### Phase 1: Start Server

```bash
npm run dev
```

Wait for: `▲ Next.js started`

### Phase 2: Generate V1 Signals (Baseline)

```bash
curl -X POST http://localhost:3000/api/seed-signals
```

**Expected response:**
```json
{
  "success": true,
  "created": 5,
  "signals": [
    {
      "match": "Arsenal vs Chelsea",
      "edge": 0.032,
      "stake": 45,
      "id": "pred_abc123"
    },
    ...
  ]
}
```

✅ You now have 5 V1 signals in the database

### Phase 3: Generate V2 Signals (Challenger)

```bash
curl -X POST http://localhost:3000/api/seed-signals-v2
```

**Expected response:**
```json
{
  "success": true,
  "system": "v2",
  "created": 5,
  "signals": [
    {
      "match": "Manchester City vs Liverpool",
      "market": "HOME",
      "edge": 0.051,
      "stake": 52,
      "modelProb": 58.2,
      "homeXG": 2.34,
      "awayXG": 1.12,
      "id": "pred_def456"
    },
    ...
  ]
}
```

✅ You now have 5 V2 signals in parallel

### Phase 4: Verify Signals Created

```bash
curl http://localhost:3000/api/predictions
```

Check the response includes v1 and v2 predictions with version tags.

### Phase 5: Settle Signals

```bash
curl -X POST http://localhost:3000/api/settle-open-bets
```

This:
- Fetches closing odds from Odds API
- Matches them to your signals
- Calculates real CLV
- Updates predictions table

**Expected output:**
```json
{
  "settled": 2,
  "skipTiming": 3,
  "diagnostics": {
    "total": 5,
    "settled": 2,
    "matchRate": "40%"
  }
}
```

⚠️ **Note:** Only settles bets >2 hours past kickoff (to avoid stale odds)

### Phase 6: Check A/B Metrics

```bash
curl http://localhost:3000/api/metrics/by-version
```

**Expected response:**
```json
{
  "v1": {
    "system": "v1 (Baseline)",
    "total": 2,
    "roi": 1.2,
    "avgClv": 0.012,
    "positiveClv": 1
  },
  "v2": {
    "system": "v2 (Upgraded)",
    "total": 2,
    "roi": 2.1,
    "avgClv": 0.021,
    "positiveClv": 2
  },
  "comparison": {
    "winner": "inconclusive",
    "recommendation": "Continue testing - insufficient data"
  }
}
```

---

## 🔄 FULL VALIDATION CYCLE (24–48 HOURS)

### Day 1 - Morning

```bash
# 1. Start server
npm run dev

# 2. Generate 10 more V1 signals
for i in {1..2}; do
  curl -X POST http://localhost:3000/api/seed-signals
  sleep 2
done

# 3. Generate 10 more V2 signals
for i in {1..2}; do
  curl -X POST http://localhost:3000/api/seed-signals-v2
  sleep 2
done

# Now you have 20 signals (10 v1, 10 v2) with future kickoffs
echo "✅ Generated 20 signals"
```

### Day 1 - Evening

The scheduler runs every 5 minutes and generates additional signals:

```
5 min:  Auto-generates v1 and v2 signals
10 min: Settlement runs (catches any past kickoffs)
...
```

You can also manually settle past-kickoff signals:

```bash
# Generate signals that are 2 hours old (ready to settle)
curl -X POST http://localhost:3000/api/seed-signals-past

# Settle them immediately
curl -X POST http://localhost:3000/api/settle-open-bets
```

### Day 2 - Check Progress

```bash
# How many settled?
curl "http://localhost:3000/api/predictions?settled=true" | jq '.summary'

# A/B test results
curl http://localhost:3000/api/metrics/by-version | jq '.'
```

**Expected after 30+ bets per system:**

```json
{
  "v1": {
    "total": 32,
    "avgClv": 0.0032,
    "positiveClv": 21,
    "positiveClvPercent": 65.6
  },
  "v2": {
    "total": 31,
    "avgClv": 0.0089,
    "positiveClv": 24,
    "positiveClvPercent": 77.4
  },
  "comparison": {
    "winner": "v2",
    "clvDifference": 0.0057,
    "recommendation": "Promote v2 - significantly better CLV"
  }
}
```

---

## 📊 MONITORING DASHBOARD

While running, keep these URLs open in tabs:

1. **Predictions Summary**
   ```
   http://localhost:3000/api/predictions
   ```
   Shows: total, open, settled, avgCLV

2. **A/B Metrics**
   ```
   http://localhost:3000/api/metrics/by-version
   ```
   Shows: v1 vs v2 comparison, winner, recommendation

3. **Live Signals**
   ```
   http://localhost:3000/api/live/signals
   ```
   Shows: current unsettled predictions, urgency

---

## 🔧 TROUBLESHOOTING

### Problem: Migration failed

**Error:** `duplicate key value violates unique constraint`

**Solution:** Migration already ran. Check:
```bash
curl http://localhost:3000/api/predictions
```

If it returns predictions with `model_version` field, you're good.

---

### Problem: Signals not settling

**Error:** `/api/settle-open-bets` shows `settled: 0`

**Reason:** Bets are only settled 2 hours after kickoff

**Solution:** Use past-kickoff signals:
```bash
curl -X POST http://localhost:3000/api/seed-signals-past
```

Then:
```bash
curl -X POST http://localhost:3000/api/settle-open-bets
```

---

### Problem: V2 endpoint returns 400

**Error:** `V2 requires bookmakers array`

**Reason:** V2 needs `bookmakers` JSON input (not auto-generated)

**Solution:** Use the seed endpoint instead:
```bash
curl -X POST http://localhost:3000/api/seed-signals-v2
```

Or provide bookmakers in your request to `/api/generate-v2`

---

## 📈 EXPECTED TIMELINE

| Time | Event |
|------|-------|
| T+0 | Generate initial v1 (5 signals) |
| T+1 min | Generate initial v2 (5 signals) |
| T+2 min | 10 signals in database |
| T+5 min | Auto-scheduler generates more v1 + v2 |
| T+10 min | Settlement runs (finds none, all future kickoff) |
| T+2h | First signals reach settlement time |
| T+2.5h | Settlement runs, settles 2-5 bets |
| T+24h | 20-30 bets settled per system |
| T+48h | 40-50 bets settled, clear winner |

---

## ✅ SUCCESS CRITERIA

After 48 hours, if you see:

```
v1: avgClv +0.2%, ROI +0.8%
v2: avgClv +0.8%, ROI +2.1%

→ SYSTEM IS WORKING
```

If you see:

```
v1: avgClv -0.1%, ROI -0.3%
v2: avgClv -0.2%, ROI -0.5%

→ EDGE NOT REAL (go back to model tuning)
```

---

## 🎯 AFTER VALIDATION: NEXT STEPS

### If V2 wins (CLV significantly better):
1. Freeze v1 (keep as baseline)
2. Scale v2 stake generation
3. Design V3 experiment (more features)
4. Run v2 vs v3 in parallel

### If V1 wins:
1. V2 needs work (odds extraction or model tuning)
2. Keep v1 as production
3. Analyze why v2 failed
4. Try different team stats or weighted approach

### If inconclusive:
1. Collect more data (60+ bets each)
2. Check confidence interval
3. Consider variance is high right now
4. Wait for signal to emerge

---

## 🚀 YOU ARE NOW READY

```
✅ Capital management system built
✅ V1 baseline configured  
✅ V2 challenger configured
✅ Database schema updated
✅ A/B testing framework live
✅ Metrics dashboard ready

GO: Run the signals and let data decide.
```

**Next command:**

```bash
npm run dev && echo "Server running - generate signals now"
```

Then use the curl commands above to start the A/B test.

Good luck. 🎯
