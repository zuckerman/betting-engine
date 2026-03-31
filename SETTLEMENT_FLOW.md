# Result Settlement Flow

## Ground Truth Validation

Your betting system now has a verified result extraction layer.

---

## Architecture

```
Sportmonks API (ground truth)
    ↓
getFixtureResult(fixtureId)
    ↓
extract: home_goals, away_goals, result
    ↓
/api/settle/{fixtureId}
    ↓
POST /api/result with verified data
    ↓
Your performance tracking
```

---

## Setup

### 1. Get Sportmonks API Key

Go to: https://www.sportmonks.com/

- Free tier available
- Get API key

### 2. Add to `.env.local`

```
SPORTMONKS_API_KEY=your_key_here
```

---

## Usage

After a match finishes, settle the bet:

```bash
curl -X POST http://localhost:3002/api/settle/19146701 \
-H "Content-Type: application/json" \
-d '{"match_id":"Celtic-Kilmarnock-1774727052807"}'
```

**Response:**

```json
{
  "success": true,
  "fixture": {
    "id": 19146701,
    "home": "Celtic",
    "away": "Kilmarnock",
    "score": "3-1",
    "result": "home_win"
  },
  "recorded": {
    "match_id": "Celtic-Kilmarnock-1774727052807",
    "home_goals": 3,
    "away_goals": 1
  }
}
```

---

## What This Does

1. ✅ Fetches verified result from Sportmonks (includes: participants, scores)
2. ✅ Extracts home_goals, away_goals, result
3. ✅ Records result in your system via `/api/result`
4. ✅ Returns confirmation

---

## Why This Matters

- **No manual data entry** (after match)
- **Single source of truth** (Sportmonks)
- **Verified scores** (before entering system)
- **Audit trail** (automatic)

---

## Next: Scale To 30-50 Bets

With this in place:

1. Run predictions → get match_id
2. After match → call `/api/settle/{fixtureId}`
3. System auto-records result
4. Performance auto-updates

**Result:** You go from manual tracking → semi-automated settlement (while keeping full control).

---

## Critical: Rules Still Frozen

This is a **settlement layer only**.

Your decision rules remain:
- `confidence > 0.55`
- `value > 0`

No changes. This just makes result tracking cleaner.

