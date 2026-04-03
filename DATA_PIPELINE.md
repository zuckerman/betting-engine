# Getting Real Data Into The System

**Status:** System built, but pipeline empty
**Goal:** Get first 20 predictions with CLV calculated
**Timeline:** 48 hours to first validation results

---

## Phase 1: Verify Pipeline Works (1 hour)

### Step 1: Load Test Data
```bash
cd /Users/williamtyler-street/Rivva
npm run build
npx ts-node scripts/seed-test-predictions.ts
```

This will:
- Insert 20 realistic test predictions
- Calculate CLV for each
- Show you initial metrics

**Expected output:**
```
Total bets: 20
Avg CLV: +0.0089 (+0.89%)
Win rate: 65%
Bets beating line: 13 / 20
```

### Step 2: Check Dashboard
```
Open: http://localhost:3005/dashboard/validation
You should now see non-null CLV values
```

### Step 3: Run SQL Audit
```
Open Supabase SQL Editor
Copy and run: SUPABASE_AUDIT.sql
Verify: All queries return results
```

**What this proves:**
- ✅ Predictions table works
- ✅ CLV calculation works
- ✅ Dashboards display correctly

---

## Phase 2: Connect Real Predictions (Next 48 hours)

Now that you know the pipeline works, connect your actual prediction source.

### Where Your Model Lives

**File:** `/src/app/api/generate/route.ts`

This is your `/api/generate` endpoint. When it runs, it should:

1. Generate predictions from your model
2. Log each one to the `predictions` table

### Current Structure

```typescript
export async function GET(request: NextRequest) {
  // Your model generates predictions here
  const predictions = await generatePredictions();
  
  // Log them
  for (const pred of predictions) {
    await supabase.from('predictions').insert({
      league: pred.league,
      match_description: pred.match,
      market: pred.market,
      model_probability: pred.modelProb,  // ← Your model output
      implied_probability: 1 / pred.odds,
      edge: pred.modelProb - (1 / pred.odds),
      odds_taken: pred.odds,
      placed_at: new Date(),
    });
  }
}
```

### Required Fields (Per Prediction)

When you log a prediction, send:

```typescript
{
  league: "EPL",                          // Competition
  match_description: "Arsenal vs Liverpool",
  market: "Over 2.5 Goals",              // Market type
  model_probability: 0.62,                // Your model's output (0-1)
  implied_probability: 1 / odds_taken,    // Bookmaker's assessment
  edge: modelProb - implied,              // Gap between your model and theirs
  odds_taken: 1.95,                      // Odds you took the bet at
  placed_at: new Date(),
}
```

---

## Phase 3: Track Results (Ongoing)

After each match settles, update the prediction:

```sql
UPDATE predictions
SET
  result = 'win',  -- or 'loss'
  closing_odds = 1.92,  -- Market's final odds
  settled_at = NOW(),
  clv = 1.92 - odds_taken
WHERE id = '<prediction_id>';
```

### Manual vs Automated

**Manual (Fast, for testing):**
- Run daily SQL updates
- Copy from your spreadsheet or bookmaker
- Takes 5 min per day

**Automated (Better, for production):**
- API call to your odds provider at match close time
- Auto-update `closing_odds`
- Query bookmaker API or scrape closing odds

---

## What NOT To Do Right Now

❌ **Don't optimize the model yet**
- 20 bets is too small
- Any optimization is curve-fitting

❌ **Don't turn on payments**
- System unproven
- You'd be selling unvalidated product

❌ **Don't change the measurement system**
- CLV formula is correct
- Stick with it

❌ **Don't look at ROI**
- CLV is your primary signal
- ROI depends on win rate AND CLV

---

## Checkpoint: Day 3 (After 20 Bets)

Run this:
```sql
select 
  count(*) as total_bets,
  avg(clv) as avg_clv_pct,
  count(case when result = 'win' then 1 end)::float / count(*) as win_rate,
  avg(model_probability) as avg_model_prob,
  (avg(model_probability) - (count(case when result = 'win' then 1 end)::float / count(*))) as calibration_error
from predictions
where clv is not null;
```

**You're looking for:**
- ✅ count > 15 (enough data)
- ✅ avg_clv > 0 (beating the line)
- ✅ win_rate > 50% (picking winners)

---

## Checkpoint: Day 7 (After 100+ Bets)

Once you hit 100 settled bets:

```bash
# Run full audit
npx ts-node -e "
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  supabase.from('predictions').select('*').then(({ data }) => {
    const clvs = data.filter(p => p.clv !== null);
    console.log('Total:', clvs.length);
    console.log('Avg CLV:', (clvs.reduce((s, p) => s + p.clv, 0) / clvs.length).toFixed(4));
    console.log('Win%:', (clvs.filter(p => p.result === 'win').length / clvs.length * 100).toFixed(1));
  });
"
```

---

## Checkpoint: Day 14 (After 300+ Bets)

**DECISION TIME**

Run full SUPABASE_AUDIT.sql and check all 4 metrics:

| Metric | Target | Meaning |
|--------|--------|---------|
| CLV | > +0.03 | Beating closing line |
| Win% | > 55% | Better than random |
| Calibration | < 5% | Accurate probabilities |
| Sample | 300+ | Statistically valid |

**All green → REAL EDGE → Deploy capital**
**Anything red → Refine or stop**

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/seed-test-predictions.ts` | Load 20 test bets (verify pipeline) |
| `src/app/api/generate/route.ts` | Real predictions go here |
| `SUPABASE_AUDIT.sql` | Analysis queries |
| `/dashboard/validation` | Daily metrics display |

---

## The Next 48 Hours

```
Hour 0–1:   Run seed script, verify pipeline works
Hour 1–2:   Check dashboard shows CLV values
Hour 2–48:  Connect your actual model predictions
Hour 48:    First real metrics appear
```

---

## Priority: ONLY Data Right Now

- ✅ Predictions logging
- ✅ Results updating
- ✅ Closing odds recording
- ❌ NOT Stripe
- ❌ NOT UI polish
- ❌ NOT optimization

**Data first. Everything else later.**

---

Once you have 20 real bets with CLV calculated and closing odds recorded:

👉 Come back with your metrics

Then we validate together.
