# Multi-Market Strategy

## 🧠 The Core Insight

You don't have one system.

You have:

> **a framework that can be tested across different markets**

---

## ⚠️ Why This Matters

Your model is implicitly trained on:

- EPL team behavior
- EPL scoring patterns
- EPL market efficiency
- EPL odds structure

---

When you switch to World Cup, you're switching:

- Different teams (international vs club)
- Different scoring distributions
- Different market efficiency (public money)
- Different odds structure

---

**Mixing these = corrupted dataset**

👉 You won't know where edge exists

---

## 🔑 The Strategy

### Phase 1: EPL Validation (Now → ~Day 10)

**Sample:** First 150 bets  
**Metric:** CLV positive or negative?  
**Decision:** Do you have edge in EPL?

---

### Phase 2: Regime Change (Late May → June)

**When:** EPL season ends, World Cup starts  
**Action:** Spin up SEPARATE tracking

---

### Phase 3: World Cup Testing (June → July)

**Sample:** New 100-150 bets  
**Isolation:** NO mixing with EPL data  
**Metric:** Does the framework work here?

---

### Phase 4: Scale by Market

**If EPL CLV > 0 + World Cup CLV > 0:**

→ Run both in parallel

---

**If EPL works but World Cup doesn't:**

→ EPL only, keep researching World Cup

---

**If either shows no edge:**

→ Don't scale, improve model for that market

---

## 📊 What This Looks Like in the DB

### Current (EPL only)

```sql
SELECT AVG(closing_odds - odds_taken) as clv
FROM predictions
WHERE competition = 'epl'
  AND season = '2025-26'
  AND result IS NOT NULL
```

---

### Future (Multi-market)

```sql
SELECT 
  competition,
  AVG(closing_odds - odds_taken) as clv,
  COUNT(*) as bets,
  STDDEV(closing_odds - odds_taken) as volatility
FROM predictions
WHERE result IS NOT NULL
GROUP BY competition
```

---

## 🔄 The Separation Principle

### DO NOT DO THIS

```
EPL pred 1 → settle
EPL pred 2 → settle
World Cup pred 1 → settle  ❌ MIXED
EPL pred 3 → settle
World Cup pred 2 → settle  ❌ MIXED
```

### DO THIS INSTEAD

```
EPL pred 1 → settle
EPL pred 2 → settle
EPL pred 3 → settle        ✅ CLEAN SAMPLE
[Evaluate EPL]

World Cup pred 1 → settle
World Cup pred 2 → settle
World Cup pred 3 → settle  ✅ SEPARATE TEST
[Evaluate World Cup]
```

---

## 📈 Expansion Timeline

| Date | Market | Status | Action |
|------|--------|--------|--------|
| Now (Mar 31) | EPL | Testing | Reach 150 bets |
| ~Apr 10 | EPL | Decision | CLV > 0? |
| May-Jun | EPL winds down | Monitor | Fewer games |
| Jun 1 | World Cup | New test | Start fresh sample |
| Jul 15 | World Cup | Decision | CLV > 0? |
| Aug | Multi-market | Scale | Run validated markets |

---

## 🧠 The Mental Model

Think of it like this:

```
System = {
  framework: "Poisson CLV model",
  markets: [
    { competition: "epl", season: "2025-26", clv: ?, edge_size: ? },
    { competition: "world_cup", season: "2026", clv: ?, edge_size: ? },
    { competition: "cricket", season: "2026", clv: ?, edge_size: ? },
  ]
}
```

---

Not like this:

```
System = "one monolithic thing that works everywhere"
```

---

## ✅ What You're Already Set Up For

Your schema now has:

- `competition` field (tracks market)
- `season` field (tracks time period)
- Indexes on both (fast segmentation)

---

Your API endpoints can filter:

```ts
// EPL only
WHERE competition = 'epl'

// World Cup only
WHERE competition = 'world_cup'

// All markets
WHERE TRUE
```

---

## 🚀 What Happens When World Cup Starts

1. **New environment variable:**
   ```
   ACTIVE_COMPETITIONS=epl,world_cup
   ```

2. **Updated signal generation:**
   ```ts
   for (const competition of ACTIVE_COMPETITIONS) {
     const signals = await generateSignals(competition)
     await insertSignals(signals, competition)
   }
   ```

3. **Separate /api/clv endpoints:**
   ```
   GET /api/clv?competition=epl
   GET /api/clv?competition=world_cup
   GET /api/clv (all markets aggregated)
   ```

4. **Independent daily snapshots:**
   ```
   POST /api/snapshot?competition=epl
   POST /api/snapshot?competition=world_cup
   ```

---

## ⚠️ What NOT to Do

During World Cup:

❌ Assume EPL model transfers 1:1  
❌ Mix data into one CLV calculation  
❌ Expect same edge size  
❌ Skip validation and scale immediately  

---

## 🔑 The Rule

> **Each market, each season = independent experiment**

---

## 🎯 Your Checklist

- ✅ Schema updated (competition + season fields)
- ✅ Indexes added for fast filtering
- ✅ Strategy documented
- ⏳ Finish EPL sample (reach 150 bets)
- ⏳ Evaluate EPL edge
- ⏳ When World Cup starts, spin up new tracking
- ⏳ Treat as fresh experiment

---

## 💡 Why This Matters

Most traders destroy their edge by:

1. Building something that works
2. Assuming it works everywhere
3. Deploying to new markets without validation
4. Losing money on corrupt data

---

You're avoiding this by:

1. Testing one market cleanly
2. Treating each market as independent
3. Validating before scaling

---

## 🚀 Final Position

You have a **framework that can test multiple markets**.

Not **one system that works everywhere**.

That's the difference between:

- **Fragile:** Works until regime changes  
- **Robust:** Validates each regime separately

---

You're building the robust version.

Keep going. 👍
