# 🎯 Multi-League Testing - Quick Start Guide

## What Just Got Completed

✅ All signal generation endpoints now support **EPL** and **Championship** in parallel
✅ Each endpoint accepts `?league=EPL` or `?league=Championship` parameter  
✅ Database inserts now track league field for diagnostic analysis

---

## 🚀 Start Generating Multi-League Signals

### Option 1: Quick Manual Test
```bash
# Generate Championship signals (V1)
curl -X POST http://localhost:3000/api/seed-signals?league=Championship

# Generate Championship signals (V2 - Adjusted Poisson)
curl -X POST http://localhost:3000/api/seed-signals-v2?league=Championship

# Generate EPL signals for comparison (baseline)
curl -X POST http://localhost:3000/api/seed-signals?league=EPL
```

### Option 2: Run Full Test Suite
```bash
bash TEST_MULTI_LEAGUE.sh
```

---

## 📊 Next Critical Step: Apply Database Migration

Before signals can be settled with CLP tracking, apply this migration:

**File:** `migrations/add_clp_mmt_tracking.sql`

**How:**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy entire contents of `migrations/add_clp_mmt_tracking.sql`
4. Paste into SQL Editor
5. Click "Run"

**What it does:**
- Adds 7 new columns: `predicted_closing_odds`, `market_movement`, `clp_error`, `signal_quality`, `edge_bucket`, `time_to_kickoff_hours`, `league`
- Creates 2 diagnostic views for quick analysis
- Creates 3 indexes for fast queries

---

## 🎬 24-Hour Validation Protocol

After migration is applied:

1. **Hour 1:** Generate 50 signals (25 EPL, 25 Championship)
   ```bash
   for i in {1..5}; do 
     curl -X POST http://localhost:3000/api/seed-signals?league=EPL
     curl -X POST http://localhost:3000/api/seed-signals?league=Championship
     sleep 2
   done
   ```

2. **Hourly:** Let auto-scheduler settle bets naturally

3. **Hour 6:** Check diagnostic dashboard
   ```bash
   curl http://localhost:3000/api/metrics/diagnostic | jq '.diagnostics.byLeague'
   ```

4. **Hour 24:** Analyze results
   - EPL CLV ≈ 0% (expected - control)
   - Championship CLV > 0% (proof of edge)

---

## 📈 What We're Looking For

### Expected EPL Results
```json
{
  "league": "EPL",
  "bets": 25,
  "avgClv": -0.001,
  "positiveClvPct": 42,
  "avgMovement": 0.03,
  "avgClpError": 0.15
}
```

### Expected Championship Results (If Edge Exists)
```json
{
  "league": "Championship",
  "bets": 25,
  "avgClv": 0.008,
  "positiveClvPct": 62,
  "avgMovement": 0.08,
  "avgClpError": 0.22
}
```

**Key Insight:** If Championship CLV > 0% and EPL CLV ≈ 0%, that's **proof your edge is in market selection, not model perfection.**

---

## 🔧 Architecture Overview

```
seed-signals/route.ts (V1 Poisson)
  └─ ?league=EPL → Arsenal vs Chelsea, Man City vs Liverpool...
  └─ ?league=Championship → Leeds vs Sheffield, Leicester vs Coventry...
  └─ Insert with league='EPL' or 'Championship'

seed-signals-v2/route.ts (V2 Adjusted Poisson)
  └─ Same league support, different model
  └─ Stricter edge gate (3%+ instead of 0%+)

generate/route.ts (Generic Handler)
  └─ Accepts league as query parameter OR in JSON body
  └─ Fallback to EPL if not specified

Settlement Pipeline (settle-open-bets/route.ts)
  └─ Already wired to calculate CLP metrics
  └─ Stores: predicted_closing_odds, market_movement, clp_error, signal_quality

Diagnostic Dashboard (metrics/diagnostic/route.ts)
  └─ Segments performance by: league, version, edge_bucket, timing
  └─ Shows winner in each category
  └─ Recommends optimal hunting ground
```

---

## 🎯 Success Criteria

| Milestone | Criteria | Timeline |
|-----------|----------|----------|
| Setup Complete | Migration applied, no errors | Today |
| Signals Generated | 50+ signals across both leagues | Hour 1-2 |
| Settlement Running | Auto-scheduler settling bets | Continuous |
| Diagnostic Data | 100+ settled bets per league | Hour 6-12 |
| Edge Identified | Championship CLV > 0% (EPL ≈ 0%) | Hour 12-24 |
| Strategy Confirmed | Stable championship edge across all metrics | Day 2-3 |

---

## ⚠️ Blockers

1. **Database migration NOT YET APPLIED**
   - All settlement endpoints will throw errors without CLP fields
   - Priority: Apply migration in Supabase today

2. **League field must exist in predictions table**
   - Migration creates this field
   - All inserts include it

3. **Diagnostic endpoint requires settled bets**
   - Need at least 10+ bets per league to see meaningful metrics

---

## 💬 Questions to Answer During Testing

1. Which league shows better CLV: EPL or Championship?
2. At what time of day is edge strongest in each league?
3. What edge size (small/medium/large) predicts CLV best?
4. Do CLP predictions improve over time or stay consistent?
5. Is V1 or V2 model better for each league?

**These answers = roadmap for next optimization phase**

---

## 🎬 Ready to Start?

1. ✅ Code complete
2. ⏳ Database migration needed (user action required)
3. 🚀 Then: Generate signals → Settle → Analyze

**TL;DR:** Run `TEST_MULTI_LEAGUE.sh`, apply migration in Supabase, let it run for 24 hours, check diagnostic dashboard.
