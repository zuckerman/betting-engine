# 👁️ CONTROL PANEL GUIDE — Your Daily Monitoring System

**Last Updated:** April 1, 2026  
**Status:** PHASE 1 ACTIVE (Monitoring Started)

---

## 🎯 THE GOAL

You have a betting system running.

Your job is **not to improve it** — it's to **watch it and let it work**.

This guide shows you exactly what to look at and what it means.

---

## 📊 PART 1 — YOUR CONTROL PANEL (THE MONITOR PAGE)

Open this in your browser:

```
http://localhost:3000/monitor
```

**Or bookmark this after deployment:**
```
https://rivva-app.vercel.app/monitor
```

This is your **eyes** into the system.

---

## 🧠 PART 2 — WHAT YOU SEE

### Top Metrics (At a Glance)

```
📊 BETTING ENGINE MONITOR

AVG CLV           POSITIVE %        TOTAL BETS        DRAWDOWN
0.032 (↑)         54.1% (✅)         87                8.2% (✅)

BALANCE           PEAK
£1,042 (↑)        £1,100
```

---

### Chart 1: Balance Curve (💰)

**What it shows:** Your bankroll over time  
**What to look for:**
- ✅ Smooth upward line = system working
- ⚠️ Flat line = no edge
- ❌ Sharp drops = risk control issue

**Action:**
- Upward? Do nothing
- Flat? Wait for more data (need 50+ bets)
- Dropping? Check drawdown status

---

### Chart 2: CLV Trend (📈)

**What it shows:** Daily average closing line value  
**What to look for:**
- ✅ Bars above 0 = beating the market
- ⚠️ Bars near 0 = break-even, need more data
- ❌ Bars below 0 = losing to market

**Action:**
- Mostly green? Good edge, keep going
- Mixed? Normal variance, continue
- Mostly red? Edge is gone, system auto-stops

---

### Real vs Shadow (🧠)

**What it shows:** Whether your filters work

```
REAL BETS              SHADOW BETS
87 bets                124 rejected
CLV: 0.032 (3.2%)      CLV: 0.018 (1.8%)
```

**What to look for:**
- ✅ Real CLV > Shadow CLV = filters catch bad bets
- ⚠️ Real CLV = Shadow CLV = no filter effect
- ❌ Real CLV < Shadow CLV = filters are backward

**Action:**
- Real > Shadow? Filters working, good
- Close? Filters not selective enough, but OK
- Shadow > Real? Something is wrong with logic

---

### System Status (🔔)

Four key checks:

```
✅ Edge Present      CLV is positive
✅ Hit Rate          >50% of bets profitable
✅ Drawdown Safe     Losses <10% of peak
✅ Sample Size       Enough bets (N≥30)
```

**All 4 green?** System is healthy, do nothing  
**One yellow?** Monitor but don't change anything  
**One red?** System should have auto-stopped

---

## 📋 DETAILED METRICS TABLE

Raw numbers for deeper analysis:

| Metric | Example | What it means |
|--------|---------|---------------|
| Total Bets | 87 | How many times system has bet |
| Settled Bets | 87 | How many have results (not pending) |
| Avg CLV | 0.032 | Average profit margin |
| Positive Rate | 54.1% | % of bets profitable |
| Drawdown | 8.2% | Current loss from peak |
| Balance | £1,042 | Current bankroll |
| Peak Balance | £1,100 | Highest balance reached |

---

## ✅ HOW TO READ IT (DECISION TREE)

### EVERY DAY — Check these 3 things (takes 30 seconds)

#### 1. Is CLV positive?
- **YES (✅)** → Continue, system working
- **NO (❌)** → Check if auto-stop triggered

#### 2. Is hit rate > 50%?
- **YES (✅)** → Continue
- **NO (❌)** → System should have stopped

#### 3. Is drawdown < 10%?
- **YES (✅)** → Risk control working
- **NO (❌)** → Check drawdown tiers

---

### DECISION GUIDE

#### 🟢 GOOD (Do Nothing)
- ✅ avg_clv > 0
- ✅ positive_rate > 50%
- ✅ real_clv > shadow_clv
- ✅ drawdown < 10%

👉 **Action:** Leave it alone

---

#### 🟡 WARNING (Watch, Don't Change)
- ⚠️ avg_clv ~ 0 (between -0.01 and +0.01)
- ⚠️ positive_rate ~ 48-52%
- ⚠️ drawdown ~ 10-15%

👉 **Action:** Check again tomorrow. Could be noise.

**Important:** Do NOT change settings or add bets manually

---

#### 🔴 STOP (Should Be Auto-Stopped)
- ❌ avg_clv < 0
- ❌ positive_rate < 48%
- ❌ shadow_clv > real_clv
- ❌ drawdown > 30%

👉 **Action:** Check logs. System should have halted automatically.

If you see this but system is still betting:
1. Check `/api/diagnostic` for errors
2. Verify kill switch logic
3. Stop manually if needed

---

## ⏱️ YOUR DAILY ROUTINE

Every day (takes 2 minutes):

1. **Open monitor page**
   ```
   http://localhost:3000/monitor
   ```

2. **Look at 3 things:**
   - ✅ Is CLV positive?
   - ✅ Is hit rate > 50%?
   - ✅ Is drawdown < 10%?

3. **Check System Status section**
   - All green? Great, continue
   - One yellow? Make a note, check tomorrow
   - One red? Investigate via diagnostic

4. **Close it and don't touch anything**

---

## 🔥 WHAT NOT TO DO

### ❌ DON'T Interfere

This system is designed to **run without you**. Every change risks introducing bias.

**Don't:**
- ❌ Manually adjust stakes
- ❌ Add or skip predictions
- ❌ Change Kelly settings
- ❌ Rebalance bankroll
- ❌ Remove failing bets

**Do:**
- ✅ Watch the metrics
- ✅ Let kill switches work
- ✅ Document observations
- ✅ Collect data for Phase 2

---

### ❌ DON'T Overreact to Variance

After 20 bets:
- CLV could swing ±2%
- Hit rate could swing ±10%
- This is normal

**Minimum sample size before taking action: 50+ bets**

---

### ❌ DON'T Check Too Often

**Bad:**
- Checking every hour
- Refreshing every 5 minutes
- Watching live trades

**Good:**
- Once per day, same time
- Quick (30 seconds)
- Then close it

---

## 📊 WHAT GOOD LOOKS LIKE (Targets)

### After 50 bets (Week 1)
- ✅ CLV: +0.5% to +3%
- ✅ Hit rate: 50-55%
- ✅ Drawdown: <5%
- ✅ Balance: +£20-50

### After 150 bets (Phase 1 complete)
- ✅ CLV: +1-3% (confirms edge)
- ✅ Hit rate: 52-55% (consistent)
- ✅ Drawdown: <15% (manageable)
- ✅ Balance: +£100-300

### Red flags (Phase 1 fails)
- ❌ CLV: negative or flat
- ❌ Hit rate: <50%
- ❌ Balance: declining
- ❌ Drawdown: >30%

---

## 🚨 ALERTS (Optional Setup)

If you want notifications instead of checking manually:

### Email Alert
```typescript
if (avg_clv < 0) {
  sendEmail({
    to: "your@email.com",
    subject: "⚠️ System Alert: CLV Negative",
    body: `CLV has turned negative (${avg_clv})`
  })
}
```

### Slack Alert
```typescript
if (drawdown > 0.10) {
  slack.send({
    channel: "#betting-alerts",
    text: `🚨 Drawdown alert: ${(drawdown * 100).toFixed(1)}%`
  })
}
```

### Telegram Alert
```typescript
if (positive_rate < 0.48) {
  telegram.send({
    chatId: YOUR_CHAT_ID,
    text: `⚠️ Hit rate too low: ${(positive_rate * 100).toFixed(1)}%`
  })
}
```

---

## 📈 INTERPRETING CHARTS

### Balance Curve

```
£1,200 |         ╱╱╱╱
       |        ╱   ╲
£1,100 |   ╱╱╱╱       ╲╱
       |  ╱
£1,000 |_╱

Good:    Smooth upward trend
Bad:     Sharp drops, flat line
Wait:    Too short to judge (<30 bets)
```

### CLV Trend

```
+3%  |  ██
+2%  |  ██    ██
+1%  |  ██    ██  ██
 0%  |__██__██__██__
-1%  |
     
Good:    Bars mostly positive
Bad:     Bars mostly negative
Wait:    Too mixed to judge (<30 bets)
```

---

## 🧮 KEY FORMULAS (Reference)

**These run automatically, but good to understand:**

### Average CLV
```
avg_clv = sum(bet_clv) / count(bets)

Example:
Bets: +0.02, +0.01, -0.01, +0.03
Avg: 0.05 / 4 = +0.0125 (1.25%)
```

### Positive Rate
```
positive_rate = count(clv > 0) / count(total_bets)

Example:
3 profitable out of 87 total
54 / 87 = 0.621 (62.1%)
```

### Drawdown
```
drawdown = (peak_balance - current_balance) / peak_balance

Example:
Peak: £1,100
Current: £1,042
Drawdown: 58 / 1,100 = 0.0527 (5.27%)
```

---

## 🎯 YOUR PHASE 1 MISSION

**Duration:** April 1 - April 10 (10 days)  
**Target:** 150 real bets + 200 shadow bets  
**Success:** CLV > 0 AND hit rate > 52%  
**Failure:** CLV < 0 OR hit rate < 48%

### Daily Checklist

- [ ] Check monitor (1 min)
- [ ] Note CLV and hit rate
- [ ] Verify system is running
- [ ] Do NOT change settings
- [ ] Do NOT interfere

### End of Phase 1 Report

```
Total Bets: ___
Avg CLV: ___
Hit Rate: ___
Max Drawdown: ___
Final Balance: ___
```

---

## 🔗 QUICK LINKS

**Dashboard:** `/monitor`  
**API Endpoint:** `/api/dashboard?experimentId=YOUR_ID`  
**Diagnostics:** `/api/diagnostic`  
**Health Check:** `/api/health`

---

## 💡 REMEMBER

You're not managing the system. **The system is managing itself.**

Your job is to:
1. ✅ Observe (look at charts)
2. ✅ Verify (check metrics)
3. ✅ Document (record observations)
4. ✅ Do nothing (resist changing things)

The moment you start interfering, you're the weakest link in the system.

**Discipline = profit.**

---

## 🚀 NEXT STEPS

1. **Today:** Open `/monitor` and bookmark it
2. **Daily:** Check once per day (same time)
3. **April 10:** Review Phase 1 results
4. **After Phase 1:** Decide on Phase 2

---

**Last Updated:** April 1, 2026  
**Status:** LIVE AND MONITORING
