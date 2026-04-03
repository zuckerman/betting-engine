# Edge Validation System

> **Status:** Ready for 14-day validation phase

---

## What You Have

✅ **A closed quantitative system:**

- **Prediction layer** (models that forecast outcomes)
- **Measurement layer** (CLV calculation)
- **Learning layer** (Bayesian calibration, meta-models, ensemble)
- **Risk layer** (Kelly sizing, bankroll constraints)
- **Promotion layer** (A/B testing with guardrails)
- **Self-correction loop** (automatic strategy evolution)

---

## What It Answers

> **Does your system consistently beat the closing line?**

That's it. Everything else is noise.

---

## How to Know If It's Real

After **300+ bets**, check your `/dashboard/validation`:

### ✅ Real Edge

- **CLV** > +0.03 (3%)
- **% Beating Market** > 55%
- **Drawdown** < 20%
- **Trend** stable or improving

### ⚠️ No Edge Yet

- **CLV** ≈ 0
- Need to refine the model

### ❌ You're Losing

- **CLV** < -0.02 (–2%)
- Market beats you
- Different approach needed

---

## The 14-Day Validation Phase

**Days 1–5:** Baseline collection
**Days 5–10:** Early signal emerges
**Days 10–14:** First real conclusions

Track daily: [`DAILY_CHECK.md`](./DAILY_CHECK.md)

---

## What Actually Matters

**Only 4 metrics:**

1. **CLV** — Are you beating the line?
2. **% Beating Market** — More than 50%?
3. **Sample Size** — 300+ = credible
4. **Drawdown** — Controlled?

Everything else is distraction.

---

## What You Should NOT Do

❌ Over-tune early (you'll chase noise)
❌ Look at ROI instead of CLV (you'll fool yourself)
❌ Change logic every day (you'll never converge)
❌ Interfere unless the system breaks

---

## What You Should DO

✅ Let it run
✅ Collect data
✅ Check the 4 metrics daily
✅ Make decisions after 300 bets only

---

## System Architecture

### Live Endpoints

- **`/api/generate`** — Generates predictions (9 AM UTC daily)
- **`/api/train`** — Auto-trains models & evolves strategies (2 AM UTC daily)
- **`/api/signals`** — Serves predictions to users (free: 2/day, pro: unlimited)

### Dashboards

- **`/dashboard/validation`** — Your 4-metric scoreboard
- **`/dashboard/models`** — Model performance + A/B testing
- **`/dashboard/evolution`** — Strategy variants + shadow testing
- **`/dashboard/staking`** — Kelly sizing + bankroll tracker

### Data Layer

- **Prediction source:** UserPrediction table (Supabase)
- **Model storage:** model_versions + model_comparisons tables
- **Calibration:** calibration_data table
- **Market regime:** market_regime table

---

## Next Steps

### Immediate (Today)

1. Run SQL migrations in Supabase:
   ```sql
   -- Copy from /migrations/add_model_versioning.sql
   -- Paste in Supabase SQL Editor → Run
   ```

2. Set Vercel environment variable:
   ```
   CRON_SECRET = (random secret string)
   ```

3. Deploy (already done):
   ```bash
   git push  # Auto-deploys to Vercel
   ```

### This Week

- System begins collecting predictions
- Daily cron at 2 AM UTC updates models
- Check `/dashboard/validation` each morning
- Fill in [`DAILY_CHECK.md`](./DAILY_CHECK.md)

### After 300 Bets (~10–14 days)

- Make real/not-real decision
- Either refine or scale

---

## The Real Insight

You're not building a trading system.

You're building **an edge detector**.

The difference: A trading system tries to make money. An edge detector tries to **honestly answer** whether an edge exists.

If it does, trading becomes trivial (just execute with Kelly sizing).

If it doesn't, no amount of trading infrastructure helps.

---

## Key File References

- [`DAILY_CHECK.md`](./DAILY_CHECK.md) — Daily discipline template
- [`00_START_HERE.md`](./00_START_HERE.md) — Architecture overview
- `/migrations/add_model_versioning.sql` — Database setup
- `/src/app/dashboard/validation/page.tsx` — Your scoreboard

---

## Important Reminders

**🧠 Protect the integrity of the system.**

- Don't interfere unless it breaks
- Don't over-tune early
- Don't chase noise
- Trust the process

**🔥 Data decides.**

Not hype, not intuition, not aspirations.

Only data.

---

**Status:** System is live. Waiting for validation data.

**Next checkpoint:** Day 14 (check CLV after 300 bets)
