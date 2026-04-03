# Data Requirements Checklist

**Before you can measure edge, you need these fields logged for each prediction:**

---

## ✅ Required Fields (Non-negotiable)

### At Prediction Time

- [ ] `id` - Unique bet identifier
- [ ] `model_probability` - Your model's predicted probability (0-1)
- [ ] `opening_odds` - Odds you placed bet at
- [ ] `league` - Which competition (EPL, LaLiga, etc)
- [ ] `market` - Market type (Moneyline, Over/Under, BTTS, etc)
- [ ] `created_at` - When bet was placed

### After Close / Settlement

- [ ] `closing_odds` - Market's final odds (critical for CLV)
- [ ] `result` - Outcome: 'win' or 'loss'
- [ ] `settled_at` - When bet was settled

---

## 🚨 Data Quality Rules

### closing_odds MUST be logged

- If you don't have closing odds, you **cannot calculate CLV**
- CLV is your primary signal
- Without it, you're flying blind

**Solution:**
- API call to your odds provider at close time
- Log the odds just before kick-off (or whatever closing time)
- Store it immediately

### result MUST be accurate

- 'win' = you picked correct outcome at your stated probability
- 'loss' = you didn't
- If game is voided/cancelled = mark as 'void' and exclude from analysis

### model_probability MUST match your model output

- Don't round to nice numbers
- Use actual model output (e.g., 0.5847, not 0.58)
- More precision = better calibration measurement

---

## 🔍 Example Data Row (What It Should Look Like)

```json
{
  "id": "pred_20260403_001",
  "model_probability": 0.6234,
  "opening_odds": 1.95,
  "closing_odds": 1.92,
  "league": "EPL",
  "market": "Over 2.5 Goals",
  "result": "win",
  "created_at": "2026-04-03T15:00:00Z",
  "settled_at": "2026-04-03T17:45:00Z"
}
```

---

## 📊 What This Enables

With these fields, you can calculate:

### 1. Implied Probability
```
implied = 1 / opening_odds
```

### 2. Edge (vs Market)
```
edge = model_probability - implied
```

### 3. CLV (vs Closing)
```
clv = (1 / closing_odds) - (1 / opening_odds)
```

### 4. Calibration
```
avg_model_prob vs actual_win_rate
```

### 5. ROI
```
(wins * opening_odds - losses) / total_bets
```

---

## 🧪 Data Validation Queries

Run these in Supabase to QA your data:

### Check for missing critical fields
```sql
SELECT COUNT(*) FROM predictions 
WHERE model_probability IS NULL 
   OR opening_odds IS NULL
   OR closing_odds IS NULL
   OR result IS NULL;
-- Should return: 0
```

### Check probability range (should be 0-1)
```sql
SELECT * FROM predictions 
WHERE model_probability < 0 OR model_probability > 1;
-- Should return: nothing
```

### Check odds are reasonable (typically 1.1 - 5.0)
```sql
SELECT * FROM predictions 
WHERE opening_odds < 1.01 OR opening_odds > 100;
-- Should return: nothing
```

### Check for duplicates
```sql
SELECT id, COUNT(*) FROM predictions 
GROUP BY id 
HAVING COUNT(*) > 1;
-- Should return: nothing
```

---

## ⚠️ Common Data Problems

### Problem: opening_odds = closing_odds for all rows
**Cause:** Not logging closing odds properly
**Fix:** Add API call to log actual close odds

### Problem: model_probability all 0.5
**Cause:** Rounding or placeholder values
**Fix:** Use raw model output, not rounded

### Problem: result always 'win'
**Cause:** Not tracking losses, or sample selection bias
**Fix:** Ensure ALL bets are logged, including losses

### Problem: model_probability > actual_win_rate by >15%
**Cause:** Overconfident model
**Fix:** Recalibrate model, or this isn't real edge

---

## 📋 Before You Can Say "I Have Edge"

All of these must be true for 300+ bets:

- [ ] avg_clv > 0.01 (1%)
- [ ] win_rate > 55%
- [ ] calibration_error < 5%
- [ ] No data quality issues
- [ ] All critical fields populated

If ANY of these fail → not real edge yet → keep refining

---

## 🚀 Once You Have Real Data

Use the audit queries in `SUPABASE_AUDIT.sql` to verify:

1. Data quality
2. Edge calculation correctness
3. CLV measurement validity
4. Probability calibration
5. Segmentation by league/market

---

**Remember:** Garbage data in = garbage conclusions out

Make sure your pipeline logs these fields correctly BEFORE you start betting real money.
