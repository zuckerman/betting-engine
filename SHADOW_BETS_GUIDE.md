# Shadow Bets: Validating Your Filter Logic

## 🎯 Why Shadow Bets Matter

You can't tell if your **filtering is adding edge** without seeing what you passed on.

**The problem:**
- Your taken bets have +2% CLV
- But what if your skipped bets had +3% CLV?
- Then your filter is **removing edge**, not adding it

**The solution:**
- Log every prediction your model generates
- Mark: taken or skipped (and why)
- After settlement: compare CLV across both groups

---

## 📊 What to Track

### Taken Bets (Prediction table)
```
Model: 58% probability
Market: 50% implied
Edge: +8%
EV: +0.16
Odds taken: 2.0
Result: WIN
Closing odds: 2.1
CLV: +0.10 ✅
```

### Shadow Bets (ShadowBet table)
```
Model: 55% probability
Market: 52% implied
Edge: +3%
EV: +0.06
Skip reason: "below_edge_threshold" (threshold = 5%)
Odds would be: 1.92
Result (eventual): LOSS
Closing odds: 1.85
CLV would have been: -0.07 ✅
```

---

## 🔑 Skip Reasons (Track These)

| Code | Meaning | Action if CLV > Taken |
|------|---------|----------------------|
| `low_ev` | EV < 0.05 | Threshold too high, lower it |
| `below_edge_threshold` | Edge < your minimum | Threshold too high |
| `high_variance` | Odds too extreme | Keep filter, adds value |
| `league_filter` | Not in your leagues | Working correctly |
| `manual_override` | You intervened | Investigate why |
| `market_type` | Market not in whitelist | Intentional |

---

## 📈 Analysis Points (Every 50 Bets)

### 1. CLV Comparison

```sql
-- Taken bets average CLV
SELECT AVG(closing_odds - odds_taken) as taken_clv
FROM Prediction
WHERE competition = 'epl'
AND result IS NOT NULL

-- Shadow bets would-have-been CLV
SELECT AVG(clv_would_have_been) as shadow_clv
FROM ShadowBet
WHERE competition = 'epl'
AND result IS NOT NULL
```

**Healthy result:**
```
Taken CLV:  +0.015 (1.5%)
Shadow CLV: -0.008 (-0.8%)
→ Filter is working ✅
```

**Warning sign:**
```
Taken CLV:  +0.010 (1.0%)
Shadow CLV: +0.020 (2.0%)
→ Filter is removing edge ❌
```

---

### 2. Hit Rate by Filter

```sql
SELECT 
  skip_reason,
  COUNT(*) as count,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::float / COUNT(*) * 100, 2
  ) as win_pct,
  ROUND(AVG(clv_would_have_been), 4) as avg_clv
FROM ShadowBet
WHERE competition = 'epl'
AND result IS NOT NULL
GROUP BY skip_reason
ORDER BY avg_clv DESC
```

**Example output:**
```
| skip_reason         | count | win_pct | avg_clv |
|---------------------|-------|---------|---------|
| high_variance       | 18    | 48%     | -0.005  | ← Good, filter worked
| below_edge_threshold| 24    | 61%     | +0.008  | ← BAD: too aggressive
| low_ev              | 12    | 52%     | -0.002  | ← OK, neutral
```

→ If a filter's shadow CLV > your taken CLV, **tighten that filter**

---

### 3. Distribution Check

```sql
SELECT 
  'Taken' as category,
  COUNT(*) as count,
  ROUND(AVG(ev), 4) as avg_ev,
  ROUND(AVG(edge), 4) as avg_edge,
  ROUND(STDDEV(closing_odds - odds_taken), 4) as clv_stddev
FROM Prediction
WHERE competition = 'epl' AND result IS NOT NULL

UNION ALL

SELECT 
  'Shadow' as category,
  COUNT(*) as count,
  ROUND(AVG(ev), 4) as avg_ev,
  ROUND(AVG(edge), 4) as avg_edge,
  ROUND(STDDEV(clv_would_have_been), 4) as clv_stddev
FROM ShadowBet
WHERE competition = 'epl' AND result IS NOT NULL
```

→ Should see similar distributions (sign filter is fair, not just lucky)

---

## 🚀 Implementation (Phase 1)

### Week 1-2 (Bets 1-50)

Every prediction that passes EV > 0.05:
- If taken: log to `Prediction`
- If skipped: log to `ShadowBet` with `skip_reason`

**Skip at this stage:**
- Stake limitations (your actual limits)
- API failures

---

### Week 2 (After 50 bets)

Query both tables:
```sql
SELECT 
  'Predictions (taken)' as type,
  COUNT(*) as count,
  ROUND(AVG(closing_odds - odds_taken), 4) as clv
FROM Prediction WHERE competition = 'epl' AND result IS NOT NULL

UNION ALL

SELECT 
  'ShadowBets (skipped)' as type,
  COUNT(*) as count,
  ROUND(AVG(clv_would_have_been), 4) as clv
FROM ShadowBet WHERE competition = 'epl' AND result IS NOT NULL
```

**Decision tree:**
- Taken CLV > Shadow CLV → Keep filters as-is ✅
- Taken CLV ≈ Shadow CLV → Filters adding noise, simplify
- Taken CLV < Shadow CLV → Filters removing edge, relax

---

### Week 3-4 (Bets 50-150)

Adjust based on shadow analysis, then **stop changing anything**.

At 150 bets:
- Final CLV from Prediction table (taken bets only)
- Reference: ShadowBet performance (validation)

---

## 🔑 Important Rules

✅ **Log shadows BEFORE kickoff** (no hindsight bias)  
✅ **Use consistent filtering rules** (don't shift thresholds)  
✅ **Track all reasons** (not just profitable ones)  
✅ **Settle shadows same as predictions** (must track closing odds)  

❌ **Don't use shadow CLV in scaling decisions** (only taken bets)  
❌ **Don't cherry-pick which shadows to track** (track ALL)  
❌ **Don't adjust filters during Phase 1** (except after 50-bet checkpoint)  

---

## 📊 Example Query (Week 2 Check-In)

```sql
WITH taken_stats AS (
  SELECT 
    competition,
    COUNT(*) as taken_count,
    ROUND(AVG(closing_odds - odds_taken), 4) as taken_clv,
    ROUND(STDDEV(closing_odds - odds_taken), 4) as taken_std
  FROM Prediction
  WHERE competition = 'epl' 
  AND result IS NOT NULL
  GROUP BY competition
),
shadow_stats AS (
  SELECT 
    competition,
    COUNT(*) as shadow_count,
    ROUND(AVG(clv_would_have_been), 4) as shadow_clv,
    ROUND(STDDEV(clv_would_have_been), 4) as shadow_std
  FROM ShadowBet
  WHERE competition = 'epl'
  AND result IS NOT NULL
  GROUP BY competition
)
SELECT 
  t.competition,
  t.taken_count,
  t.taken_clv,
  t.taken_std,
  s.shadow_count,
  s.shadow_clv,
  s.shadow_std,
  CASE 
    WHEN t.taken_clv > s.shadow_clv THEN '✅ Filters working'
    WHEN ABS(t.taken_clv - s.shadow_clv) < 0.003 THEN '⚠️ Neutral filter'
    ELSE '❌ Filters removing edge'
  END as filter_quality
FROM taken_stats t
JOIN shadow_stats s ON t.competition = s.competition
```

---

## 💡 What You'll Learn

After 100 bets with full shadow tracking:

1. **Is your edge real?** (CLV signal vs luck)
2. **Are your filters helping or hurting?** (comparison to shadows)
3. **Which leagues are you best in?** (shadow CLV by league)
4. **Is your model consistent?** (CLV variance analysis)

Then at 150 bets:
→ You have **statistical confidence** to decide

---

## 🎯 Final Position

Shadow bets are your **sanity check**.

They tell you:
- Your filters aren't just lucky
- Your edge is repeatable
- Your model understands its limits

This is how **professional quant shops** validate systems.

You're building that way from day one.

---

See [QUICK_REF.md](QUICK_REF.md) for daily tracking.  
See [OPERATOR_HANDBOOK.md](OPERATOR_HANDBOOK.md) for discipline rules.
