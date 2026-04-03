# 🧪 TESTING YOUR PREDICTIONS PIPELINE

## Step 1: Prepare your model

The runner needs to call your actual model. Open [send-predictions.ts](./send-predictions.ts) or [send_predictions.py](./send_predictions.py) and replace the `getModelPredictions()` function with your actual code.

**Example (TypeScript):**
```ts
async function getModelPredictions(): Promise<ModelPrediction[]> {
  // Your actual model call here
  const results = await myModel.generatePredictions();
  return results.map(r => ({
    fixture_id: r.id,
    home: r.homeTeam,
    away: r.awayTeam,
    market: 'over_2_5',
    prob_over: r.predictions.over25,
    best_odds: r.currentOdds,
    timestamp: new Date().toISOString()
  }));
}
```

---

## Step 2: Start your dev server

Make sure Rivva is running locally:

```bash
npm run dev
```

Should output: `✓ Ready in X.Xs`

---

## Step 3: Run the test script

**Option A: TypeScript**
```bash
npx ts-node scripts/send-predictions.ts
```

**Option B: Python**
```bash
python scripts/send_predictions.py
```

---

## Step 4: Check the output

You should see something like:

```
🚀 Starting prediction pipeline
📍 API: http://localhost:3000

📊 Pipeline: 5 predictions

✅ SENT: 12345 | event="Arsenal vs Chelsea" | edge=1.12
✅ SENT: 12346 | event="Man City vs Liverpool" | edge=1.18
⏭️  SKIPPED: 12347 | Probability out of bounds [0,1]
⏭️  SKIPPED (API): 12348 | reason="No positive edge" | edge=0.89
❌ ERROR: 12349 | Send failed: Connection refused

📈 Results: 2 sent | 2 skipped | 1 failed

✅ Pipeline complete
```

**What this means:**
- ✅ **SENT** = Prediction accepted and stored in database
- ⏭️ **SKIPPED** = Validation failed (bad data)
- ⏭️ **SKIPPED (API)** = Edge gate rejected it (no positive edge)
- ❌ **ERROR** = Connection or other issue

---

## Step 5: Verify in database

Check that predictions actually made it to the database:

```bash
# In your terminal:
npx prisma studio
```

Then:
1. Open `http://localhost:5555`
2. Click `predictions` table
3. Should see new rows with your predictions

**Check these fields:**
- `edge` (should be > 1.0 for accepted bets)
- `model_probability` (should be 0–1)
- `odds_taken` (should be > 1.0)
- `placed_at` (should be now)

---

## Step 6: Check the dashboard

Open `http://localhost:3000/dashboard/validation`

You should see:
- Total count increased
- CLV updated
- Win rate updated (will be noisy with few bets)

---

## ⚠️ Common Issues

### "Connection refused"
- Dev server not running
- Wrong API_URL
- Server crashed

**Fix:**
```bash
npm run dev
```

---

### "HTTP 400"
- Malformed prediction data
- Check that `modelProbability` is 0–1
- Check that `oddsTaken` is > 1.0

---

### "No predictions returned from model"
- `getModelPredictions()` is still the mock
- Replace it with your actual model call

---

### Predictions appear but all get "skipped (API)"
- All have edge ≤ 1.0
- Model probabilities or odds are wrong
- Check the math: `prob * odds` must be > 1

---

## 🚀 Once Testing Works

When you see predictions flowing into the database:

```bash
git add -A
git commit -m "feat: add prediction sender script"
git push
```

Then tell me:

👉 **"data is flowing"**

And we'll add closing odds tracking.

---

## 🧠 Running Daily

Once you verify this works locally, set up automation:

**Easiest: Add to your crontab**

```bash
crontab -e
```

Add:
```
0 9 * * * cd /Users/williamtyler-street/Rivva && npx ts-node scripts/send-predictions.ts >> /tmp/predictions.log 2>&1
```

Then predictions run automatically every day at 9 AM UTC.

Check logs:
```bash
tail -f /tmp/predictions.log
```

---

## ⏱ Remember

Once you start this, you have 14 days of hands-off validation.

```
No model tweaks.
No manual filtering.
No "improvements".
```

Just watch:
- CLV
- % beating market
- Sample size

Then decide.
