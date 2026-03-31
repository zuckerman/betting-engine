# PHASE 3: Data Validation

## Current System Status

**What's Running:**
- ✅ Poisson model generating signals (hourly via cron)
- ✅ Bets inserting to Supabase with signal quality flag
- ✅ CLV tracking (rolling 50, by league, by odds range, by signal quality)
- ✅ System state engine (GREEN/AMBER/RED) controlling stakes

**What's Frozen:**
- ❌ No new features
- ❌ No complexity layers
- ❌ No manual interference

---

## Your Three Metrics (Only These)

### 1. Rolling CLV (Last 50 bets)

**Location:** `GET /api/clv` → `.rolling50.avgClv`

**Target:** > 0

**What it means:**
- Positive CLV = you're beating the closing line
- Proof of real edge
- Most important signal

---

### 2. Beat Rate (% beating market)

**Location:** `GET /api/clv` → `.rolling50.beatingMarketPct`

**Target:** 55–60%

**What it means:**
- How often your bet odds beat the closing odds
- If < 50%, your model is worse than market
- If > 55%, you're consistently smarter than market

---

### 3. Signal Quality Breakdown

**Location:** `GET /api/clv` → `.segmentation.bySignalQuality`

**What to watch:**
- HIGH signals (EV > 8%, edge > 5%): CLV should be highest here
- NORMAL signals (EV 5-8%, edge 3-5%): Should still be positive

**What it tells you:**
- Where your real edge is
- Which signals are actually valuable
- Guides future threshold tightening

---

## Timeline

### Days 1–2 (0–50 bets)
Noise. Don't react.

### Days 3–5 (50–100 bets)
CLV stabilizing. Edge starting to show.

### Days 6–10 (100–150 bets)
**Decision window.** Your metrics determine next phase.

---

## The 150-Bet Decision

### 🟢 GREEN (CLV > 0 + Beat Rate > 55%)
**Decision:** Edge is real
- Scale stakes by 20%
- Begin AI layer implementation
- Proceed to Phase 4

### 🟡 AMBER (CLV ≈ 0 + Beat Rate ~50%)
**Decision:** Uncertain, needs improvement
- Increase EV threshold from 0.05 → 0.08
- Increase edge threshold from 0.03 → 0.04
- Filter harder, take only best signals
- Run another 100 bets with stricter rules

### 🔴 RED (CLV < 0 or Beat Rate < 50%)
**Decision:** Edge is not real
- STOP BETTING immediately
- Model is miscalibrated
- Need to rebuild (market has shifted or model assumptions are wrong)

---

## Check Daily

```bash
# Full metrics
curl -s http://localhost:3000/api/clv | jq '.rolling50, .systemState'

# Just CLV
curl -s http://localhost:3000/api/clv | jq '.rolling50.avgClv'

# Beat rate
curl -s http://localhost:3000/api/clv | jq '.rolling50.beatingMarketPct'

# Signal quality
curl -s http://localhost:3000/api/clv | jq '.segmentation.bySignalQuality'
```

---

## What NOT to Do

- ❌ Change thresholds midway
- ❌ Manually place bets outside the system
- ❌ Override RED state decisions
- ❌ Add features (AI, mobile, bot, etc.)
- ❌ Scale stakes before checkpoint
- ❌ Try different models
- ❌ Check results every hour

---

## What to Expect

### Variance is Normal
- 5 losses in a row → normal
- Periods of flat returns → normal
- 10–20% drawdowns → normal

### You Will Question Everything
- Day 3: "Is this working?"
- Day 7: "Why is it so slow?"
- Day 10: "Should I change something?"

**Answer: No. Do nothing.**

---

## When to Come Back

Text when you reach **150 settled bets** with metrics:
- Rolling CLV
- Beat rate
- Signal quality breakdown

Then I'll help you evaluate and decide next move.

---

**Status:** VALIDATION PHASE  
**Duration:** 7–10 days  
**Your job:** Monitor, don't interfere
