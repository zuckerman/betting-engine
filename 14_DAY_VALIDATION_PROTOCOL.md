# 🎯 14-DAY VALIDATION PROTOCOL

**Date Started:** [You fill in]  
**System:** Sharp CLV (Odds API + Market Consensus)  
**Goal:** Detect real edge vs market

---

## 📋 Pre-Launch Checklist

Before you start, verify:

```
☐ ODDS_API_KEY added to .env.local
☐ Ran verification script successfully
☐ System starts: npm run dev
☐ Dashboard loads: http://localhost:3000
☐ First 3 bets have valid CLV values
☐ No errors in console
```

If any ☐ is not done, **STOP and fix it first**.

---

## 🧪 What You're Testing

**NOT:** "Does the system win bets?"

**BUT:** "Does it beat the market price?"

```
Your model + Entry odds
         ↓
vs Sharp market consensus
         ↓
CLV measurement
```

---

## 📊 Metrics to Track

Add to your dashboard or spreadsheet:

### Daily (Each Morning)

```
Date           | Bets   | Avg CLV | % Positive | Spread Avg
─────────────────────────────────────────────────────────
Apr 4 (Day 1)  | 5      | +0.3%   | 60%        | 2.1%
Apr 5 (Day 2)  | 8      | +0.1%   | 50%        | 2.3%
...
```

### Weekly (Every 7 Days)

```
Week 1 (Apr 4-10):
  Total bets: 47
  Avg CLV: +0.42%
  % positive: 57%
  Calibration: Good (close to predicted)
  Spread avg: 2.2%
```

---

## 🧠 How to Interpret Results

### Day 1-2: Sanity Check

```
✅ GOOD:
  - CLV values exist (not all 0)
  - Mix of positive and negative
  - Spread < 3% (markets coherent)
  
❌ RED FLAG:
  - CLV always 0 → bug
  - All positive → data error
  - Spread > 5% → bad market data
```

### Day 3-5: First Pattern

```
✅ GOOD:
  - Avg CLV between -0.5% and +1%
  - ~50-55% positive CLV
  - Consistent spread
  
⚠️ CONCERNING:
  - Avg CLV very negative (< -1%)
  - < 50% positive
  - Spread unstable
```

### Day 6-10: Signal Emerges

```
✅ STRONG EDGE:
  - Avg CLV > +0.5%
  - % positive > 55%
  - Stable day-to-day
  
⚠️ WEAK / NO EDGE:
  - Avg CLV ~ 0%
  - Mixed signals
  - High variance
  
❌ MODEL LOSING:
  - Avg CLV < -0.5%
  - % positive < 45%
  - Consistent negative
```

### Day 11-14: Decision Window

```
IF: CLV +0.5%+ AND % Positive 55%+ AND STABLE
  → ✅ REAL EDGE DETECTED
     Decision: Scale capital / Consider Betfair upgrade

IF: CLV ~ 0% OR % Positive ~ 50%
  → ⚠️ UNCLEAR / NO EDGE YET
     Decision: Run another 14 days / Adjust model

IF: CLV < -0.5% OR % Positive < 45%
  → ❌ MODEL LOSING TO MARKET
     Decision: Debug model / Try different approach
```

---

## 🚨 What Can Go Wrong (& How to Fix)

### 🔴 Issue: "CLV always 0 or very small"

**Cause:** API not connected or prices identical  
**Fix:** Run verification script  
```bash
node scripts/verify-sharp-clv-pipeline.js
```
**Check:**
- API key working?
- Sharp books returning prices?
- Consensus calculating?

---

### 🔴 Issue: "Spread too wide (>5%)"

**Cause:** Bad market or data error  
**Fix:** Check Odds API output  
**Result:** System auto-skips (spread > 8% rejected)

---

### 🔴 Issue: "No bets being settled"

**Cause:** 
1. No predictions in database yet
2. Settlement cron not running
3. Event times passed but not settled

**Fix:**
```bash
# Manually trigger settlement
curl http://localhost:3000/api/settle-bets
```

---

### 🔴 Issue: "CLV negative consistently"

**Cause:** 
1. Entry odds worse than market consensus (expected sometimes)
2. Model predictions consistently losing
3. Bug in CLV calculation

**Fix:** 
- Check that entry odds make sense
- Verify model is competitive
- Run one manual verification

---

## 📝 Daily Log Template

Copy this each day:

```markdown
## Day 1 - April 4

**Morning Check:**
- System status: ✅ Running
- API key: ✅ Working
- First 3 bets: ✅ CLV calculated

**Metrics:**
- Bets so far: 5
- Avg CLV: +0.24%
- % Positive: 60%
- Spread avg: 2.3%
- Issues: None

**Notes:**
- Markets coherent (low spread)
- Mix of positive and negative CLV
- System working as expected

**Action:**
- Continue monitoring
- Check again tomorrow
```

---

## 🎯 Decision Table

After ~100 bets or 14 days (whichever comes first):

| Avg CLV | % Positive | Decision | Action |
|---------|-----------|----------|--------|
| >+0.5% | >55% | ✅ Real edge | Scale / Upgrade |
| 0 to +0.5% | 50-55% | ⚠️ Unclear | Run 14 more days |
| -0.5% to 0% | 45-50% | ❌ No edge | Iterate model |
| <-0.5% | <45% | ❌ Losing | Debug model |

---

## 🔐 Important Rules (DON'T VIOLATE)

```
❌ DO NOT:
  - Change model during 14 days
  - Adjust filters
  - Change staking
  - Manually override bets
  - Cherry-pick best days
  - Add/remove bookmakers
  
✅ DO:
  - Let system run automatically
  - Track metrics daily
  - Note anomalies
  - Run verification if unsure
  - Be honest about results
```

---

## 🚀 After 14 Days

### If Edge Detected (CLV +0.5%+)

```
Next Steps:
1. Verify consistency (run another 7 days?)
2. Consider upgrading to Betfair live (£499)
3. Scale capital responsibly
4. Monitor drawdown
5. Set profit targets
```

### If No Edge (CLV ~ 0%)

```
Next Steps:
1. Review model assumptions
2. Check prediction accuracy
3. Try different league/market
4. Adjust entry filters
5. Run another 14-day test
```

### If Losing (CLV < -0.5%)

```
Next Steps:
1. Debug model predictions
2. Check if entry odds are realistic
3. Verify Odds API is working
4. Try different sport/market
5. Rebuild model from scratch?
```

---

## 📊 Dashboard Metrics (You Should See)

On your dashboard, track:

- `avgSharpCLV` - Should be +0.5%+ after 7 days
- `positiveCLVPercent` - Should be 55%+ after 7 days
- `validSampleSize` - Should grow daily
- `spreadAvg` - Should stay 1-3%
- `bookCount` - Should be 2-3 consistently

---

## 💡 Key Insights

```
1. You're measuring vs SHARP market (not soft books)
   → If you beat sharp, you have real edge

2. Spread < 3% = markets agree (good signal)
   → Spread > 8% = rejected automatically

3. CLV +0.5% = 0.5% ROI on average
   → Compounded over 365 days = significant

4. 14 days = ~70-100 bets
   → Enough data to see pattern

5. Honesty > Optimism
   → Don't trick yourself with results
```

---

## 🎯 Your Checklist (Print This)

```
DAY 1:
  ☐ System running
  ☐ API working
  ☐ First bets have CLV values
  ☐ Fill daily log

DAY 3:
  ☐ Check avg CLV (should exist)
  ☐ Check % positive (~50%)
  ☐ Fill weekly summary

DAY 7:
  ☐ Pattern emerging?
  ☐ Metrics stable?
  ☐ No major issues?
  ☐ Update summary

DAY 14:
  ☐ Final metrics calculated
  ☐ Decision made (scale/iterate/pause)
  ☐ Next action planned
```

---

## 📞 What to Report Back

After first 3 days, tell me:

```
Day 3 Status:
- Bets processed: X
- Avg CLV: +X.XX%
- % Positive: XX%
- Issues: None/[list]
- Next check: Day 7
```

After day 7:

```
Day 7 Summary:
- Total bets: X
- Avg CLV: +X.XX%
- % Positive: XX%
- Spread avg: X.X%
- Pattern: [edge/unclear/losing]
- Status: [continue/investigate]
```

After day 14:

```
Day 14 Final:
- Total bets: X
- Avg CLV: +X.XX%
- % Positive: XX%
- Decision: [scale/iterate/pause]
- Next step: [...]
```

---

## 🚀 You're Ready

The system is running.  
The market will tell you the truth in 14 days.

**No secrets. No tricks. Just data.**

Let's see what it says. 🎯
