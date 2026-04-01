# 🔧 MIGRATION GUIDE: From Basic → Institutional

**Status**: Ready to deploy  
**Breaking changes**: None (additive schema)  
**Rollback**: Disabled (schema changes are permanent)

---

## 📋 WHAT'S CHANGING

### NEW TABLES

1. **`experiments`** – Regime isolation
2. **`bankroll`** – Capital tracking
3. **`bets`** – Real vs shadow bets

### UPDATED TABLES

1. **`predictions`** – Added `experimentId` (foreign key)
2. **`daily_snapshot`** – Added `experimentId`

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backup Current Database

```bash
# Export current state (optional but recommended)
pg_dump -h localhost -U postgres -d betting_engine > backup_$(date +%Y%m%d).sql
```

---

### Step 2: Update Prisma Schema

✅ **Already done** — check [prisma/schema.prisma](../prisma/schema.prisma)

Key additions:
- `Experiment` model
- `Bankroll` model
- `Bet` model (new)
- `experimentId` foreign key on `Prediction` + `DailySnapshot`

---

### Step 3: Generate Migration

```bash
cd /Users/williamtyler-street/Rivva

npx prisma migrate dev --name "add_institutional_engine"
```

This will:
1. ✅ Create `experiments` table
2. ✅ Create `bankroll` table
3. ✅ Create `bets` table
4. ✅ Add `experimentId` columns
5. ✅ Add indexes for fast queries

---

### Step 4: Verify Schema

```bash
npx prisma db push  # Apply all pending migrations
npx prisma studio  # Visual database explorer
```

Check in studio:
- [ ] `experiments` table exists
- [ ] `bankroll` table exists
- [ ] `bets` table exists
- [ ] `Prediction` has `experimentId`
- [ ] `DailySnapshot` has `experimentId`

---

### Step 5: Initialize First Experiment

```bash
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EPL_2026_V1",
    "competition": "EPL",
    "startingBalance": 1000
  }'
```

Response:
```json
{
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

Save the `experiment.id` — you'll use it in the next step.

---

### Step 6: Test Dashboard

```bash
curl "http://localhost:3000/api/dashboard?experimentId=550e8400-e29b-41d4-a716-446655440000"
```

Response:
```json
{
  "metrics": {
    "totalBets": 0,
    "avgClv": 0,
    "positiveClvRate": 0,
    "drawdown": 0,
    "currentBalance": 1000
  }
}
```

✅ If you see metrics, deployment is successful.

---

### Step 7: Build & Deploy

```bash
npm run build  # Local verification
npm run start  # Production test
```

If build passes:
```bash
git add -A
git commit -m "Deploy institutional engine: experiments + bankroll + bets + Kelly"
git push
```

---

## 🔄 MIGRATION DATA (IF YOU HAVE EXISTING PREDICTIONS)

If you have old predictions without `experimentId`:

```sql
-- Create default experiment (one-time)
INSERT INTO experiments (name, sport, competition, status)
VALUES ('EPL_2026_LEGACY', 'football', 'EPL', 'complete');

-- Get the ID
SELECT id FROM experiments WHERE name = 'EPL_2026_LEGACY';

-- Update old predictions (replace XXX with actual ID)
UPDATE predictions
SET experiment_id = 'XXX-YOUR-ID-XXX'
WHERE experiment_id IS NULL;

-- Verify
SELECT COUNT(*) FROM predictions;
```

---

## ✅ VALIDATION CHECKLIST

After deployment:

- [ ] `npx prisma studio` shows all 8 tables
- [ ] `Experiment` table has at least 1 row (EPL_2026_V1)
- [ ] `Bankroll` table linked to experiment
- [ ] `Bets` table exists and empty (ready for first bets)
- [ ] `GET /api/dashboard?experimentId=XXX` returns 200 with metrics
- [ ] `POST /api/run-loop` returns 200 (even if no bets)
- [ ] Build passes: `npm run build` completes in <15s
- [ ] No TypeScript errors

---

## 🚨 ROLLBACK (IF NEEDED)

If deployment fails:

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back "add_institutional_engine"

# Or just rollback schema in code
git checkout prisma/schema.prisma

# Regenerate Prisma client
npx prisma generate
```

---

## 📊 DATA INTEGRITY

### Guarantees:
- ✅ Foreign keys enforce (no orphaned predictions)
- ✅ Unique constraints on `experiment.name`
- ✅ Unique constraints on `bankroll.experimentId` (one bankroll per experiment)
- ✅ Indexes on all query paths (fast lookups)

### No data loss:
- ✅ Old predictions remain in database
- ✅ Just need `experimentId` populated
- ✅ Fully backward compatible

---

## 🔐 BEFORE RUNNING PRODUCTION LOOP

1. **Verify CLV calculation works**:
   ```bash
   curl -X POST http://localhost:3000/api/run-loop
   ```

2. **Check logs for errors**:
   ```bash
   tail -f .next/logs/api-run-loop.log
   ```

3. **Verify dashboard updates**:
   ```bash
   curl "http://localhost:3000/api/dashboard?experimentId=XXX"
   ```

4. **Test drawdown protection** (manually):
   - Query bankroll: set `currentBalance` = 700 (30% drawdown)
   - Run loop: should NOT generate bets
   - Verify logs say "Drawdown > 30% → STOP BETTING"

---

## 🎯 POST-DEPLOYMENT SETUP

### 1. Configure Cron (Vercel)

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/run-loop",
    "schedule": "0 */6 * * *"
  }]
}
```

This runs the loop every 6 hours.

### 2. Configure Monitoring

Add to your observability tool (Sentry, LogRocket, etc):
- Alert on: CLV < 0 (kill switch)
- Alert on: Drawdown > 20% (risk alert)
- Track: Bet count, CLV trend, balance

### 3. Daily Dashboard Check

```bash
# Add to your morning routine (or set Slack bot)
curl "http://localhost:3000/api/dashboard?experimentId=YOUR_EXPERIMENT_ID"
```

---

## 📝 QUICK REFERENCE

**Key endpoints:**
- Create experiment: `POST /api/experiment/create`
- Run loop: `POST /api/run-loop`
- Dashboard: `GET /api/dashboard?experimentId=XXX`
- Status: `GET /api/experiment/status?competition=EPL`

**Key tables:**
- `experiments` – regime isolation
- `bankroll` – capital tracking
- `bets` – real + shadow predictions
- `predictions` – model output

**Key metrics:**
- `avg_clv` – is your model beating the market?
- `positive_clv_rate` – what % of bets beat the market?
- `drawdown` – capital preservation metric
- `currentBalance` – compounding capital

---

**After this migration, your system will operate like a professional fund.**

✅ **You're ready.**
