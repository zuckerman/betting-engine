# REGIME CHANGE WARNING

## 🚨 Critical: End of Season Approaching

Your EPL model has ~6 weeks of validation runway before **regime change**.

### What Happens May 25

- EPL season ends
- Games drop to near-zero
- World Cup starts (high volume, different market)

---

## ⚠️ What NOT to Do

When games disappear:

❌ Don't assume your model works for World Cup  
❌ Don't keep betting EPL data (will have fewer samples)  
❌ Don't mix World Cup data into EPL metrics  
❌ Don't scale based on EPL results alone  

---

## ✅ What TO Do

### Now → April 10 (~150 EPL bets)

1. Validate EPL edge cleanly
2. Get clear answer: CLV > 0?
3. Document what worked

---

### April 10 → May 25

1. Run EPL signals while available
2. DO NOT introduce new sports
3. Monitor stability (edge holding?)

---

### May 25 → June 1 (Transition)

1. **Stop EPL** (not enough games)
2. **Prepare World Cup** (switch competition tracking)
3. **Review EPL results** (what did we learn?)

---

### June 1 → July 15 (World Cup)

1. **Fresh experiment** (new 150-bet sample)
2. **Separate tracking** (competition = "world_cup")
3. **Independent metrics** (is World Cup edge different?)

---

## 📊 The Key Difference

### EPL Characteristics

- Consistent teams
- Familiar patterns
- Efficient market
- Small edges (if any)

### World Cup Characteristics

- New teams
- No history together
- Public money bias
- Potential larger edges

---

**Your edge size may be completely different.**

That's OK. That's the point of testing.

---

## 🔑 Regime Isolation

Your schema now supports:

```sql
SELECT AVG(closing_odds - odds_taken)
FROM predictions
WHERE competition = 'epl'   -- EPL only
AND season = '2025-26'       -- This season only
```

vs.

```sql
SELECT AVG(closing_odds - odds_taken)
FROM predictions
WHERE competition = 'world_cup'  -- World Cup only
AND season = '2026'              -- WC season only
```

---

**Use this.** Don't mix.

---

## 💡 Why This Matters

Most quant traders fail because:

1. Build system that works (EPL)
2. Season changes
3. They assume it still works
4. They don't re-validate
5. They lose money

---

You're not that trader.

You're validating separately.

---

## 🚀 Your Checklist

- ✅ Understand regime change is coming
- ✅ Schema supports market separation
- ✅ APIs can filter by competition
- ⏳ Finish EPL validation (150 bets)
- ⏳ Lock in EPL edge decision
- ⏳ When World Cup starts, spin up new experiment
- ⏳ Treat World Cup as fresh test

---

## 📍 Current Status (Relative to Regime Change)

```
EPL Validation → World Cup Prep → World Cup Validation → Scale
      ↑                                    
    NOW                              May 25            Jun 1 → Jul 15
```

You're at the start.

Regime change is 8 weeks away.

---

## One Rule

> **Each market, each season = separate validation cycle**

Do not deviate.

---

See [MULTI_MARKET_STRATEGY.md](MULTI_MARKET_STRATEGY.md) for full details.
