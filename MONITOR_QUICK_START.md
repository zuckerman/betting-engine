# 📊 MONITOR QUICK START

**Your visual control panel for Phase 1 betting**

---

## 🚀 Get Started (2 Steps)

### Step 1: Open the Monitor
```
http://localhost:3000/monitor
```

### Step 2: Check These 3 Numbers

```
AVG CLV         POSITIVE %      TOTAL BETS
0.032 (3.2%)    54.1%           87
```

---

## ✅ What's Good?

| Metric | Good | Bad |
|--------|------|-----|
| **CLV** | > 0% | < 0% |
| **Positive %** | > 50% | < 50% |
| **Drawdown** | < 10% | > 30% |
| **Real vs Shadow** | Real > Shadow | Shadow > Real |

---

## 📈 The Two Charts

### 1. Balance Curve (💰)
- ⬆️ Going up? System working
- ➡️ Flat? Not enough data yet
- ⬇️ Going down? Check drawdown

### 2. CLV Trend (📊)
- 🟢 Green bars? Good edge
- ⚪ Mixed? Normal variance
- 🔴 Red bars? Edge is dying

---

## 🧠 Real vs Shadow

**What it tells you:** Do your filters work?

- ✅ Real CLV > Shadow CLV → Filters catch bad bets
- ⚠️ About equal → Filters not helping
- ❌ Shadow CLV > Real CLV → Something wrong

---

## 🔔 System Status

Four checks that must all be green:

```
✅ Edge Present      (CLV positive)
✅ Hit Rate          (>50% profitable)
✅ Drawdown Safe     (<10% loss)
✅ Sample Size       (30+ bets)
```

---

## ⏱️ Daily Routine

**30 seconds, once per day:**

1. Open monitor
2. Check 3 numbers (CLV, Hit%, Drawdown)
3. Verify all 4 status checks are green
4. Close it
5. Don't touch anything

---

## 🚨 If Something's Wrong

| What You See | What to Do |
|--------------|-----------|
| CLV < 0 | System should have stopped |
| Hit rate < 50% | System should have stopped |
| Shadow > Real | Check filter logic |
| Drawdown > 30% | System should have stopped |

👉 **Check `/api/diagnostic` if system didn't stop**

---

## 🎯 What Success Looks Like

### After 50 bets:
- ✅ CLV: +0.5% to +3%
- ✅ Hit rate: 50-55%
- ✅ Balance: +£20-50

### After 150 bets (Phase 1 complete):
- ✅ CLV: +1-3%
- ✅ Hit rate: 52-55%
- ✅ Balance: +£100-300

---

## 🔗 Links

- **Monitor:** http://localhost:3000/monitor
- **API:** http://localhost:3000/api/dashboard
- **Diagnostics:** http://localhost:3000/api/diagnostic
- **Health:** http://localhost:3000/api/health

---

**That's it. Daily monitor, no interference. Simple.**
