# OPERATOR HANDBOOK

## 🧠 Your Role (Critical Mindset Shift)

You are **NOT** a builder anymore.
You are **NOT** a bettor.

You are:

👉 **A system operator running a controlled experiment**

---

## 🔑 What Operators Do

- ✅ **Monitor** (observe metrics)
- ✅ **Record** (log daily snapshots)
- ✅ **Do NOT interfere** (no tweaks mid-run)
- ✅ **Make decisions at checkpoints** (100 bets, 150 bets)

---

## 📊 The Three Metrics You Watch (Only These)

### 1. Rolling CLV
**What**: Closing odds minus odds taken, averaged  
**Why**: Direct measure of edge  
**Watch for**: Trend direction, not absolute value  
**Good sign**: Trending positive

### 2. Beat Rate
**What**: % of predictions with odds taken > implied probability  
**Why**: Shows if your model is beating the market  
**Watch for**: Stabilizing around 55%+  
**Good sign**: Consistent above 50%

### 3. Sample Size
**What**: Total bets accumulated  
**Why**: Below 80 bets is noise, 150+ is signal  
**Watch for**: Progress toward checkpoints  
**Good sign**: Approaching 100, then 150

---

## ❌ What NOT to Interpret (Before 80 Bets)

- ❌ Single day dips or spikes
- ❌ Profit/loss (too noisy)
- ❌ Beat rate daily swings
- ❌ Segment performance variance
- ❌ Any single-bet results

👉 **Only look at trend direction.**

---

## 🔥 The Discipline Test (This Is Real)

You will be tempted to tweak. Here's what failure looks like:

### Tweaks That Kill The Experiment

❌ **Raising EV threshold** ("Let me filter more tightly")  
→ Changes what you measure, invalidates baseline

❌ **Adjusting stakes early** ("This isn't moving fast enough")  
→ Corrupts CLV calculation

❌ **Adding filters for leagues** ("This sport looks bad")  
→ Cherry-picking destroys signal

❌ **Interpreting single-day dips** ("Oh no, today was bad")  
→ Below 80 bets is pure noise

### If You Feel The Urge

Repeat:

> "If I change things now, I won't know if the edge is real or if I just corrupted the data."

---

## 📊 Your Daily Routine (Automated)

**DO NOT manually call endpoints.**

Your snapshot should run automatically via cron.

```bash
# Cron: runs once daily (23:59 UTC recommended)
# POST https://yourdomain.com/api/snapshot
```

**Why automated?**
→ Removes human inconsistency  
→ Consistent timing  
→ Can't accidentally skip a day  

**Manual check (if needed):**
```bash
# Review last 7 days
curl https://yourdomain.com/api/snapshot | jq '.snapshots[0:7]'
```

---

## 📈 What You Should Expect (Realistic Curve)

### Days 1–3 (First Bets)
**Status**: Noisy, unstable  
**CLV**: All over the place  
**Beat rate**: Random-looking  
**Your emotion**: "This doesn't look good"

👉 **Action**: Do nothing. This is normal.

---

### Days 4–7 (Pattern Forming)
**Status**: Stabilizing  
**CLV**: Trend starting to show  
**Beat rate**: Settling toward baseline  
**Your emotion**: "Maybe this is working?"

👉 **Action**: Still do nothing. Keep watching.

---

### Days 7–10 (Clarity Emerges)
**Status**: Signal clear  
**CLV**: Positive or negative trend obvious  
**Beat rate**: Consistent direction  
**Your emotion**: "Now I see it"

👉 **Action**: Still watching. Prepare for checkpoint.

---

## 🚨 What Will Test You (Even If You're Disciplined)

These feelings will come. Expect them:

### 1. Model Doubt
*"Is the Poisson model actually good?"*

👉 Ignore. CLV will tell you.

### 2. False Confidence Spike
*"First 30 bets look great — should I scale now?"*

👉 No. Need 150 bets minimum.

### 3. Urge to Improve
*"I could add X feature to fix Y problem"*

👉 Do NOT. You'll corrupt the experiment.

### 4. Narrative Seeking
*"The market shifted because..."*

👉 Stop. You need data, not stories.

---

## 🎯 The Only Metric That Matters

```
Is CLV consistently positive?
```

---

Everything else is secondary.

---

## 📍 Checkpoint: 100 Bets (Trend Signal Check)

**Action**: Review only trends (ignore daily noise)

**What to look for**:
- Is CLV trending positive or negative?
- Is beat rate stabilizing around 55%+?
- Are HIGH quality signals outperforming NORMAL signals?

**What to do**:
- If trending GREEN → continue confidently
- If trending AMBER → continue, monitor carefully
- If trending RED → investigate but keep running

👉 **Do NOT make any changes.** This is just observation.

👉 **Do NOT stop.** You still need 50 more bets to decide.

---

## 📊 What Your Dashboard Shows (Automated)

**Daily snapshot captures:**

- Total bets accumulated
- Rolling CLV (all signals)
- CLV from HIGH quality signals only
- CLV from NORMAL signals only
- Beat rate
- Expected vs actual profit
- System state (GREEN/AMBER/RED)

👉 You review, not create. Cron handles logging.

---

## 🔍 What High vs Normal CLV Tells You

```
high_quality_clv > normal_quality_clv
```

✅ **Your filter works** — HIGH signals are genuinely better

```
high_quality_clv ≈ normal_quality_clv
```

⚠️ **Filter doesn't matter** — may need to revisit selection criteria

```
normal_quality_clv > high_quality_clv
```

❌ **Something is inverted** — investigate (likely data issue)

---

## 🏁 Checkpoint: 150 Bets (Day 9–10)

**Action**: Make THE decision

**Ask only this one question**:

> Is CLV consistently positive?

---

### If YES (CLV > 0)

You have edge.

**Next steps**:
- Scale stakes slowly (10–20% increase)
- Start layering AI explanations
- Begin multi-sport expansion
- Document what worked

---

### If NO (CLV ≤ 0)

You do not have edge yet.

**Next steps**:
- Do NOT scale
- Do NOT market
- Stop betting
- Diagnose: is model wrong? Is market smarter? Is data bad?
- Fix and retry

---

### If UNCERTAIN (CLV ≈ 0)

Edge is unclear.

**Options**:
- Run another 100 bets to clarify
- Tighten filters (EV > 0.08, edge > 0.04)
- Reduce marginal bets
- Investigate segmentation: where does real edge live? (HIGH signals? certain leagues?)

---

## 🧠 If You Feel Tempted to Tweak

Repeat this:

> "If I change things now, I won't know if I improved the system or corrupted the experiment."

---

The experiment is more valuable than a quick win.

---

## 📝 Daily Log Template

Copy this each day:

```
Date: [today]

Bets accumulated: [total]
Rolling CLV: [value]
Beat rate: [%]
Expected profit: [value]
Actual profit: [value]
System state: [GREEN/AMBER/RED]

Observations: [what's changing?]
Changes made: [list any tweaks — should be NONE]
Next action: [continue/checkpoint/review]
```

---

## 🚫 Things You Cannot Do (Locked Until Validation)

- ❌ Add AI layer
- ❌ Build mobile app
- ❌ Expand to multi-sport
- ❌ Add execution bot
- ❌ Scale bankroll
- ❌ Market the system
- ❌ Change model thresholds
- ❌ Override system decisions

---

All of these unlock ONLY after CLV proof.

---

## ✅ Things You CAN Do

- ✅ Monitor daily snapshots
- ✅ Review trends (multi-day)
- ✅ Document observations
- ✅ Prepare for checkpoint
- ✅ Study model assumptions (don't change them)
- ✅ Design what comes next (don't build it)

---

## 🔥 The One Rule

> **If CLV is not positive, nothing else matters.**

---

That's it. That's your north star for 10 days.

---

## 🎯 Success Criteria

**For this phase to be successful:**

- CLV trending positive OR clearly negative (not ambiguous)
- Beat rate consistent (not random)
- Expected ≈ actual (model honest)
- Zero tweaks made mid-run
- Decision at 150 bets is clear

---

## 🧠 Your Mission (Clear)

You are not:
❌ operating a betting system

You are:
✅ **running a live statistical experiment**

---

**Your job**:
- Watch 3 metrics (CLV, beat rate, sample size)
- Interpret only trend direction (not noise)
- Make zero changes for 10 days
- Record all data automatically via cron
- Decide at 150 bets (one question: CLV > 0?)

---

**Duration**: 9–10 days  
**Role**: Observer + recorder (not tinkerer)  
**Key skill**: Discipline, not intelligence  
**Next checkpoint**: 100 bets (signal check) + 150 bets (decision)  
**Final decision**: Scale (if CLV > 0) OR rebuild (if not)

---

## 🔥 The Real Challenge

Building the system was hard.

**Keeping your hands off it is harder.**

Most people fail here.

You won't.
