# 📇 QUICK REFERENCE CARD — Phase 1 Monitoring

**Print this. Keep it visible.**

---

## 🎯 DAILY (Takes 30 seconds)

1. Open: `http://localhost:3000/monitor`
2. Check 3 numbers:
   - **CLV** > 0%? ✅/❌
   - **Hit Rate** > 50%? ✅/❌  
   - **Drawdown** < 10%? ✅/❌
3. All 3 green? → Do nothing, close monitor
4. Any red? → Check `/api/diagnostic`

---

## 📊 THE 6 METRICS YOU WATCH

| Metric | Good | Okay | Bad |
|--------|------|------|-----|
| **CLV** | +1 to +3% | 0 to +1% | < 0% |
| **Hit %** | 52-55% | 50-52% | < 48% |
| **Drawdown** | < 5% | 5-10% | > 30% |
| **Bets** | 50-150 | 20-50 | < 20 |
| **Real > Shadow** | ✅ Yes | ≈ Equal | ❌ No |
| **Status Lights** | All ✅ | 3/4 ✅ | < 3 ✅ |

---

## 📈 TWO CHARTS YOU READ

### Balance Curve (💰)
```
✅ Smooth up = Profitable
➡️ Flat = No edge yet
❌ Down = Losing
```

### CLV Trend (📊)
```
✅ Green bars = Beating market
⚪ Mixed = Normal variance
❌ Red bars = Edge gone
```

---

## 🧠 REAL VS SHADOW

```
Real bets (actual money):    87
Shadow bets (tracking):      124

Real CLV:    3.2%  ✅
Shadow CLV:  1.8%
                    ↑ Real > Shadow = Filter works
```

---

## 🚨 SYSTEM STATUS (All 4 Must Be Green)

- ✅ Edge Present (CLV > 0)
- ✅ Hit Rate OK (>50%)
- ✅ Drawdown Safe (<10%)
- ✅ Sample Size (30+)

---

## ✅ GOOD (Do Nothing)

```
✅ CLV positive
✅ Hit rate > 50%
✅ Real > Shadow  
✅ Smooth curve
✅ All lights green
```

**ACTION:** Close monitor. Don't touch anything.

---

## ⚠️ WARNING (Watch Only)

```
⚠️ CLV near 0% (-0.01 to +0.01)
⚠️ Hit rate 48-52%
⚠️ Drawdown 10-15%
⚠️ < 50 bets total
```

**ACTION:** Note it. Check again tomorrow. Don't change settings.

---

## 🔴 STOP (Auto-Halted)

```
❌ CLV < 0%
❌ Hit rate < 48%
❌ Shadow > Real
❌ Drawdown > 30%
```

**ACTION:** System should have stopped. Check `/api/diagnostic` if still betting.

---

## 📋 WHAT NOT TO DO

```
❌ Check hourly
❌ Change settings
❌ Adjust stakes
❌ Skip predictions
❌ Hedge bets
❌ Judge before 50 bets
```

---

## ✅ WHAT TO DO

```
✅ Check daily (same time)
✅ Document 3 numbers
✅ Leave everything alone
✅ Wait 10 days
✅ Make decision Apr 10
```

---

## 🎯 PHASE 1 SUCCESS = BOTH TRUE

1. **CLV > 0.5%**
2. **Hit Rate > 52%**

---

## 📅 TIMELINE

```
Apr 1-5:   Early (noisy data)
Apr 6-10:  Decisive (real trends)
Apr 11+:   Decision time
```

---

## 🔗 LINKS

- Monitor: `/monitor`
- API: `/api/dashboard`
- Health: `/api/health`
- Debug: `/api/diagnostic`

---

## 💪 REMEMBER

> "Your job is to watch, not to fix."
> "All interference introduces risk."
> "Discipline now = profit later."

---

**Keep this card visible during Phase 1.**
