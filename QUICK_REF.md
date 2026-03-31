# VALIDATION PHASE — QUICK REFERENCE

## Your Daily Job (2 minutes)

```bash
curl https://yourdomain.com/api/clv | jq '.'
```

**Extract only:**
- `.rollingClv`
- `.beatRate`
- `.count` (or .predictions.length)

---

## Log in DAILY_LOG.md

```
DATE: [today]
CLV: [value]
Beat rate: [%]
Bets: [count]
NOTES: [one line]
CHANGES: NONE
```

---

## The 3 Metrics

| Metric | Goal | Early | Mid | Late |
|--------|------|-------|-----|------|
| **CLV** | Positive | Random | Stabilizing | Clear trend |
| **Beat rate** | 55%+ | 48-52% | 50-54% | 55%+ |
| **Bets** | 150 | 0-50 | 50-100 | 100-150 |

---

## Timeline

| Days | Status | Action |
|------|--------|--------|
| 1-3 | Noisy | Do nothing |
| 4-7 | Settling | Watch trend |
| 7-10 | Clear | Prepare decision |
| ~10 | **Decision** | **Scale / tighten / stop** |

---

## Hard Rules

✅ Record every day  
✅ Only modify DAILY_LOG.md  
✅ Trust the process  

❌ NO model tweaks  
❌ NO threshold changes  
❌ NO mid-run "improvements"  

---

## Decision at 150 Bets

```
CLV > 0   → SCALE (you have edge)
CLV ≈ 0   → TIGHTEN (edge unclear)
CLV < 0   → STOP (model needs work)
```

---

## One Question

> Is the market pricing moving toward my side over time?

---

**Stay disciplined. Let data speak.**
