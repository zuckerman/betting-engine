# ⚡ QUICK REFERENCE: API COMMANDS

Copy-paste ready commands for testing the complete system.

---

## 🔧 SETUP (One-time)

### 1. Apply Database Migration

In Supabase SQL Editor:
```sql
-- Copy entire contents of:
-- migrations/add_versioning_and_bankroll.sql
```

### 2. Start Server

```bash
npm run dev
```

Wait for: ✅ `▲ Next.js started`

---

## 🎬 GENERATE SIGNALS

### V1 Signals (Baseline)

```bash
curl -X POST http://localhost:3000/api/seed-signals
```

**Response:** 5 v1 signals with smart stakes

### V2 Signals (Challenger)

```bash
curl -X POST http://localhost:3000/api/seed-signals-v2
```

**Response:** 5 v2 signals with team xG data

### Past Kickoff Signals (For Immediate Testing)

```bash
curl -X POST http://localhost:3000/api/seed-signals-past
```

**Response:** 5 signals already 2 hours past kickoff (ready to settle)

---

## 📊 CHECK STATUS

### All Predictions

```bash
curl http://localhost:3000/api/predictions | jq '.'
```

Shows: total, open, settled, avgCLV, full predictions array

### Only Settled

```bash
curl "http://localhost:3000/api/predictions?settled=true" | jq '.summary'
```

Shows: How many settled, average CLV

### Live Unsettled Signals

```bash
curl http://localhost:3000/api/live/signals | jq '.'
```

Shows: Current open predictions with edge and urgency

---

## ⚙️ SETTLEMENT

### Settle Open Bets

```bash
curl -X POST http://localhost:3000/api/settle-open-bets | jq '.'
```

Fetches closing odds, calculates CLV, updates DB

Expected: `settled: 0–5` (depends on how many past kickoff)

### Settle + Check Diagnostics

```bash
curl -X POST http://localhost:3000/api/settle-open-bets | jq '.diagnostics'
```

Shows:
- total: How many bets checked
- settled: How many actually settled
- skipTiming: How many too early
- skipNoOdds: How many no closing odds found
- skipNoMatch: How many couldn't match fixture

---

## 📈 A/B TEST RESULTS (CRITICAL)

### Compare V1 vs V2

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.'
```

**Response structure:**
```json
{
  "v1": {
    "system": "v1 (Baseline)",
    "total": 30,
    "totalStaked": 1250,
    "roi": 1.2,
    "avgClv": 0.0032,
    "positiveClv": 20,
    "positiveClvPercent": 66.7
  },
  "v2": {
    "system": "v2 (Upgraded)",
    "total": 28,
    "totalStaked": 1190,
    "roi": 2.1,
    "avgClv": 0.0089,
    "positiveClv": 21,
    "positiveClvPercent": 75.0
  },
  "comparison": {
    "winner": "v2",
    "clvDifference": 0.0057,
    "recommendation": "Promote v2 - significantly better CLV"
  }
}
```

**What to look for:**
- `v2.avgClv > v1.avgClv` → V2 is better
- `v2.positiveClvPercent > v1.positiveClvPercent` → V2 hits more
- `comparison.winner` → Objective decision

---

## 🧪 FULL TEST CYCLE (One Command Each)

### Generate 10 V1 Signals

```bash
for i in {1..2}; do curl -X POST http://localhost:3000/api/seed-signals; sleep 1; done
```

### Generate 10 V2 Signals

```bash
for i in {1..2}; do curl -X POST http://localhost:3000/api/seed-signals-v2; sleep 1; done
```

### Generate Past-Kickoff Signals (Immediate Test)

```bash
for i in {1..2}; do curl -X POST http://localhost:3000/api/seed-signals-past; sleep 1; done
```

### Settle All

```bash
curl -X POST http://localhost:3000/api/settle-open-bets
```

### Check Results

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.comparison'
```

---

## 🔍 DEBUGGING

### See Raw Predictions (All)

```bash
curl http://localhost:3000/api/predictions | jq '.predictions'
```

### See Only V1 Predictions

```bash
curl http://localhost:3000/api/predictions | jq '.predictions | map(select(.system_version == "v1"))'
```

### See Only V2 Predictions

```bash
curl http://localhost:3000/api/predictions | jq '.predictions | map(select(.system_version == "v2"))'
```

### See Settled Predictions Only

```bash
curl "http://localhost:3000/api/predictions?settled=true" | jq '.predictions | .[0:5]'
```

### See One Prediction in Detail

```bash
curl http://localhost:3000/api/predictions | jq '.predictions[0]'
```

Shows: full data including edge, stake, odds, CLV, versions

### Count Bets by Status

```bash
curl http://localhost:3000/api/predictions | jq '.predictions | group_by(.settled) | map({settled: .[0].settled, count: length})'
```

---

## 📊 TRACKING OVER TIME

### Create Log File

```bash
mkdir -p logs
```

### Check Status Every 5 Minutes

```bash
while true; do
  echo "=== $(date) ===" >> logs/validation.log
  curl -s http://localhost:3000/api/metrics/by-version | jq '.comparison' >> logs/validation.log
  sleep 300  # 5 minutes
done
```

### View Live Log

```bash
tail -f logs/validation.log
```

---

## 🧮 CALCULATE METRICS MANUALLY

### Total ROI

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.v2.roi'
```

### How Many More Winners in V2?

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.comparison.clvDifference * 100'
```

### Confidence

If `sampleSizeV2 >= 30`: High confidence
If `sampleSizeV2 >= 20`: Medium confidence
If `sampleSizeV2 < 20`: Low confidence, keep testing

---

## 🚨 TROUBLESHOOTING

### Migration Failed

```bash
curl http://localhost:3000/api/predictions | head
# If it has model_version field → migration worked
```

### No Bets Settling

```bash
curl -X POST http://localhost:3000/api/seed-signals-past
curl -X POST http://localhost:3000/api/settle-open-bets
```

### Metrics Endpoint Returns Error

```bash
# Check if predictions table has version columns
curl http://localhost:3000/api/predictions | jq '.predictions[0] | keys'
# Should include: model_version, odds_version, system_version
```

### No V2 Signals Generated

```bash
# Check error
curl -X POST http://localhost:3000/api/seed-signals-v2
# If error about "Cannot find module" → missing import, check build
```

---

## 🎯 DECISION POINTS

### After 5 Bets Per System

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.comparison'
```

**Too early to decide** — High variance
→ Action: Continue to 30 bets

### After 20 Bets Per System

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.comparison'
```

**Signal emerging** — Pattern forming
→ Action: Continue to 50 bets if unclear

### After 50 Bets Per System

```bash
curl http://localhost:3000/api/metrics/by-version | jq '.comparison'
```

**Clear winner** — Make decision
→ Action:
  - If V2 wins by >0.3%: Promote V2
  - If V1 wins: Improve V2, try again
  - If tie: Both equivalent, iterate different angle

---

## 💾 EXPORT DATA

### Export All Predictions as CSV

```bash
curl http://localhost:3000/api/predictions | jq -r '.predictions | 
  ["match", "system_version", "edge", "stake", "clv", "settled"] as $headers | 
  [$headers] + map([.match, .system_version, .edge, .stake, .clv, .settled]) | 
  .[] | @csv' > predictions.csv
```

### Export Settled Only

```bash
curl "http://localhost:3000/api/predictions?settled=true" | jq -r '.predictions | 
  map(select(.settled == true)) | 
  map([.match, .system_version, .edge, .clv]) | 
  @csv' > settled.csv
```

---

## ✅ CHECKLIST BEFORE DECLARING WINNER

- [ ] Applied database migration
- [ ] Generated 25+ V1 signals
- [ ] Generated 25+ V2 signals
- [ ] Settled 20+ V1 bets
- [ ] Settled 20+ V2 bets
- [ ] V1 avgClv calculated
- [ ] V2 avgClv calculated
- [ ] Difference > 0.2% (meaningful)
- [ ] Checked dashboard: `/api/metrics/by-version`
- [ ] Decision made (promote v2 or iterate)

---

**All commands are production-ready. Use them to validate the system.**
