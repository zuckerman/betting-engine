# ✅ DEPLOYMENT VERIFICATION CHECKLIST

**Run this after deploying to confirm everything works**

---

## 1. SCHEMA VERIFICATION

### Check all models exist

```bash
npm run prisma studio

# Verify in Prisma Studio:
☐ experiments table (see rows: should have EPL_2026_V1)
☐ bankroll table (see rows: should have 1 row)
☐ predictions table (see schema + indexes)
☐ bets table (see schema + indexes)
☐ daily_snapshot table (see schema + indexes)
☐ shadow_bets table (see schema + indexes)
☐ odds_snapshot table
☐ users table
```

### Check foreign keys

```bash
npm run prisma db push

# Verify:
☐ Prediction.experimentId → Experiment.id
☐ Bet.experimentId → Experiment.id
☐ Bankroll.experimentId → Experiment.id (unique)
☐ All cascading deletes work
```

---

## 2. API ENDPOINT VERIFICATION

### Test 1: Create Experiment

```bash
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{
    "name":"EPL_2026_TEST",
    "competition":"EPL",
    "startingBalance":1000
  }'

# Expected: 200 OK
# Response: {success: true, experiment: {...}, bankroll: {...}}
Status: ☐ PASS ☐ FAIL
```

Save the experiment ID from response.

### Test 2: Dashboard

```bash
curl "http://localhost:3000/api/dashboard?experimentId=YOUR_ID"

# Expected: 200 OK
# Response: {success: true, metrics: {...}}
# Metrics should show: totalBets: 0, avgClv: 0, drawdown: 0
Status: ☐ PASS ☐ FAIL
```

### Test 3: Run Loop

```bash
curl -X POST http://localhost:3000/api/run-loop

# Expected: 200 OK
# Response: {success: true}
Status: ☐ PASS ☐ FAIL
```

### Test 4: Analytics Query

```bash
curl -X POST http://localhost:3000/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId":"YOUR_ID",
    "query":"clv-health"
  }'

# Expected: 200 OK
# Response: {success: true, result: {avgClv: 0, positiveRate: 0, ...}}
Status: ☐ PASS ☐ FAIL
```

---

## 3. DATA INTEGRITY CHECKS

### Check immutability constraints

```sql
-- Should fail (no duplicates)
SELECT DISTINCT
  experiment_id, 
  fixture_id, 
  market
FROM bets
GROUP BY experiment_id, fixture_id, market
HAVING COUNT(*) > 1;

# Expected: No rows
Status: ☐ PASS (0 rows) ☐ FAIL (rows exist)
```

### Check foreign keys

```sql
-- Should have no orphaned bets
SELECT COUNT(*)
FROM bets b
WHERE b.experiment_id NOT IN (SELECT id FROM experiments);

# Expected: 0
Status: ☐ PASS ☐ FAIL
```

### Check experiment-bankroll 1:1

```sql
-- Each experiment should have exactly 1 bankroll
SELECT 
  e.id,
  COUNT(b.id) as bankroll_count
FROM experiments e
LEFT JOIN bankroll b ON e.id = b.experiment_id
GROUP BY e.id
HAVING COUNT(b.id) != 1;

# Expected: No rows
Status: ☐ PASS ☐ FAIL
```

---

## 4. PERFORMANCE VERIFICATION

### Check indexes are being used

```bash
# Run dashboard query and check execution time
time curl "http://localhost:3000/api/dashboard?experimentId=YOUR_ID" > /dev/null

# Expected: < 500ms
Status: ☐ PASS (< 500ms) ☐ FAIL (> 500ms)
```

### Check query plans

```sql
EXPLAIN ANALYZE
SELECT AVG(clv)
FROM bets
WHERE experiment_id = 'YOUR_ID'
AND is_shadow = false;

# Should use indexes (Bitmap Index Scan or Index Scan)
# Should NOT do sequential scan
Status: ☐ PASS (uses index) ☐ FAIL (seq scan)
```

---

## 5. SAFETY FEATURE VERIFICATION

### Test CLV Kill Switch

```bash
# 1. Create test experiment
curl -X POST http://localhost:3000/api/experiment/create \
  -H "Content-Type: application/json" \
  -d '{"name":"KILL_SWITCH_TEST","competition":"EPL","startingBalance":1000}'

# 2. Manually insert 50 bets with avg_clv < 0
# (Use direct DB or test endpoint)

# 3. Run loop
curl -X POST http://localhost:3000/api/run-loop

# Expected: Logs show "CLV NEGATIVE → SYSTEM HALTED"
Status: ☐ PASS ☐ FAIL
```

### Test Drawdown Protection

```bash
# 1. Get your experiment's bankroll ID
# 2. Manually set: currentBalance = 500, peakBalance = 1000 (50% DD)
# 3. Run loop
curl -X POST http://localhost:3000/api/run-loop

# Expected: Logs show drawdown protection applied
Status: ☐ PASS ☐ FAIL
```

---

## 6. BUILD VERIFICATION

### Check build passes

```bash
npm run build

# Expected output:
# ✓ Compiled successfully in Xs
# ✓ Generated static pages (X/X)
# No errors, no warnings
Status: ☐ PASS ☐ FAIL
```

### Check no TypeScript errors

```bash
npm run type-check

# Expected: No errors
Status: ☐ PASS ☐ FAIL
```

---

## 7. ENVIRONMENT VERIFICATION

### Check Supabase connection

```bash
# Test if can connect to Supabase
curl "http://localhost:3000/api/health"

# Expected: 200 OK with status information
Status: ☐ PASS ☐ FAIL
```

### Check all env vars present

```bash
# Verify these are set:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Expected: Both should print values (not empty)
Status: ☐ PASS ☐ FAIL
```

---

## 8. DOCUMENTATION VERIFICATION

- ☐ Can you find all 10 documentation files?
- ☐ Can you read GETTING_STARTED.md without errors?
- ☐ Can you follow MIGRATION_GUIDE.md step-by-step?
- ☐ Can you understand SQL_REFERENCE.md queries?
- ☐ Can you find all commands in QUICK_REF_INSTITUTIONAL.md?

---

## FINAL CHECKLIST

### Prerequisites
- ☐ Database migrated (no errors)
- ☐ All 8 models exist
- ☐ All 7 endpoints work
- ☐ Build passes (TypeScript clean)

### Core Functionality
- ☐ Can create experiment
- ☐ Can view dashboard
- ☐ Can run loop
- ☐ Can query analytics

### Safety Features
- ☐ Kill switches verified
- ☐ Risk controls verified
- ☐ Immutability verified
- ☐ Foreign keys verified

### Performance
- ☐ Queries < 500ms
- ☐ Indexes used
- ☐ No N+1 problems

### Documentation
- ☐ All 10 guides readable
- ☐ All examples work
- ☐ All commands tested

---

## DEPLOYMENT SIGN-OFF

| Item | Status | Date | Notes |
| ---- | ------ | ---- | ----- |
| Schema deployed | ☐ PASS | __/__/__ | ___________ |
| APIs tested | ☐ PASS | __/__/__ | ___________ |
| Data integrity | ☐ PASS | __/__/__ | ___________ |
| Safety verified | ☐ PASS | __/__/__ | ___________ |
| Build passes | ☐ PASS | __/__/__ | ___________ |
| Performance OK | ☐ PASS | __/__/__ | ___________ |
| Docs complete | ☐ PASS | __/__/__ | ___________ |

**Overall Status**: ☐ READY FOR PHASE 1 ☐ NEEDS FIXES

---

## COMMON ISSUES & FIXES

### "Migration failed"
- [ ] Check database connection in `.env`
- [ ] Check Supabase API keys are correct
- [ ] Run: `npm run prisma migrate status`

### "Dashboard returns 500 error"
- [ ] Check Supabase service role key is set
- [ ] Check experiment ID exists
- [ ] Check logs: `tail -f .next/logs/*.log`

### "Run loop fails"
- [ ] Check no active experiment (create one first)
- [ ] Check logs for actual error
- [ ] Verify database connection

### "Query returns no results"
- [ ] Check experiment has bets (may be 0 initially)
- [ ] Check query parameters are correct
- [ ] Verify SQL indexes are built

---

## SUCCESS

If all items checked ✅:

**You're ready for Phase 1.**

Next steps:
1. Configure cron: `vercel.json` with `/api/run-loop`
2. Start monitoring: Check dashboard daily
3. Log observations: Use DAILY_LOG.md template
4. Evaluate at 150 bets: CLV > 0?

---

**Print this page. Check off as you verify.**

**When all items pass, you're production-ready.**
