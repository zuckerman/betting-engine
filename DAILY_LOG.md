# Daily Validation Log

Track only **3 metrics**. Update once per day (~2 min). Do nothing else.

---

## Template (copy this each day)

```
DATE: [today]

METRICS (from curl https://yourdomain.com/api/clv):
- Rolling CLV: [value]
- Beat rate: [%]
- Sample size: [count]

NOTES: [one line max — trend observation only]
CHANGES MADE: [should be NONE]
```

---

## Sample entries (what good looks like)

```
DATE: Day 3 (31 Mar 2026)
METRICS:
- Rolling CLV: -0.012 (slightly negative)
- Beat rate: 49% (stabilizing)
- Sample size: 24 bets

NOTES: Early noise, ignore. On track.
CHANGES MADE: NONE
```

```
DATE: Day 6 (3 Apr 2026)
METRICS:
- Rolling CLV: +0.003 (moving positive)
- Beat rate: 54% (trending toward 55%)
- Sample size: 68 bets

NOTES: Trend forming. Continue observing.
CHANGES MADE: NONE
```

```
DATE: Day 10 (7 Apr 2026)
METRICS:
- Rolling CLV: +0.018 (positive)
- Beat rate: 56% (confirmed)
- Sample size: 152 bets

NOTES: Signal clear. Decision checkpoint reached.
CHANGES MADE: NONE
```

---

## Rules

✅ **Update once per day** (same time)  
✅ **Record exact numbers** (from API, not memory)  
✅ **One-line notes** (trend only, no stories)  
✅ **Never change anything** (mark as NONE if tempted)  

❌ **Never adjust thresholds**  
❌ **Never filter leagues**  
❌ **Never interpret single days**  
❌ **Never skip days**  

---

## Decision points (when to review)

**Day 5 (~100 bets):**  
Ask: Is CLV trending positive or negative?  
Action: Continue. Make no changes.

**Day 10 (~150 bets):**  
Ask: Is CLV consistently positive?  
Action: Decide (scale, tighten, or stop).

---

## Your first entry

```
DATE: Day 1 (31 Mar 2026)
METRICS:
- Rolling CLV: [check /api/clv]
- Beat rate: [check /api/clv]
- Sample size: [check /api/clv]

NOTES: [initial snapshot]
CHANGES MADE: NONE
```
