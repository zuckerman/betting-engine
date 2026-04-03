# 🎯 Betfair Mapper Integration Guide

**Status:** ✅ Ready to integrate (awaiting Betfair API verification)

---

## 📋 What You Have Now

Location: `src/lib/betfair-mapper.ts`

### Core Functions

```typescript
// Single prediction → market
mapFixtureToMarket(prediction, markets, options?) → MapperResult | null

// Multiple predictions → markets (batch)
mapFixturesToMarkets(predictions, markets, options?) → MapperBatchResult

// Utilities
normalizeTeam(name) → string
toGeneratePayload(prediction, mapperResult, modelData) → object
```

### Test Suite

Location: `scripts/test-mapper.js`

```bash
node scripts/test-mapper.js
```

**Result:** ✅ All 10 tests passing

---

## 🔌 Integration Points (When Betfair API is Live)

### Step 1: Create Betfair Service

**File:** `src/lib/betfair-service.ts`

```typescript
import { BetfairRunner, BetfairMarket } from './betfair-mapper'

export async function listMatchOddsMarkets(eventIds?: string[]) {
  // Call Betfair listMarketCatalogue
  const response = await fetch('https://api.betfair.com/exchange/betting/json-rpc/v1', {
    method: 'POST',
    headers: {
      'X-Application': process.env.BETFAIR_APP_KEY!,
      'X-Authentication': process.env.BETFAIR_SESSION_TOKEN!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'BettingService/listMarketCatalogue',
      params: {
        filter: {
          eventTypeIds: ['1'], // Football
          marketTypes: ['MATCH_ODDS']
        },
        marketProjections: ['RUNNER_METADATA', 'COMPETITION'],
        sort: 'FIRST_TO_START',
        maxResults: 500
      },
      id: 1
    })
  })

  const data = await response.json()
  return data.result as BetfairMarket[]
}
```

### Step 2: Create Odds Service

**File:** `src/lib/odds-service.ts`

```typescript
import { mapFixtureToMarket } from './betfair-mapper'
import { listMatchOddsMarkets } from './betfair-service'
import type { Prediction } from './betfair-mapper'

export async function getClosingOdds(prediction: Prediction) {
  // Get all available markets
  const markets = await listMatchOddsMarkets()

  // Map prediction to market
  const mapping = mapFixtureToMarket(prediction, markets, {
    minConfidence: 0.8,
    timeToleranceMinutes: 90
  })

  if (!mapping) {
    return null
  }

  // Get live odds for the matched market
  const odds = await getMarketOdds(mapping.marketId)
  
  return {
    marketId: mapping.marketId,
    homeRunnerId: mapping.homeRunnerId,
    awayRunnerId: mapping.awayRunnerId,
    bestOdds: odds
  }
}

async function getMarketOdds(marketId: string) {
  const response = await fetch('https://api.betfair.com/exchange/betting/json-rpc/v1', {
    method: 'POST',
    headers: {
      'X-Application': process.env.BETFAIR_APP_KEY!,
      'X-Authentication': process.env.BETFAIR_SESSION_TOKEN!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'BettingService/listMarketBook',
      params: {
        marketIds: [marketId],
        priceProjection: { priceData: ['EX_ALL'] }
      },
      id: 1
    })
  })

  const data = await response.json()
  return data.result[0]?.runners || []
}
```

### Step 3: Update Settlement Endpoint

**File:** `src/app/api/settle-bets/route.ts`

Change this line:

```typescript
// BEFORE (simulated)
const closingOdds = simulateClosingOdds(p.odds_taken)

// AFTER (real Betfair)
const closingOdds = await getClosingOdds({
  home: p.home_team,
  away: p.away_team,
  kickoff: p.event_start.toISOString()
})
```

### Step 4: Verify Integration

```bash
# Test with a live market
curl http://localhost:3000/api/settle-bets
```

Expected output:
```json
{
  "settled": 5,
  "failed": 0,
  "avgCLV": 0.025,
  "message": "Settled 5 / 5 predictions with real Betfair odds"
}
```

---

## 🚀 Migration Timeline

### Before Betfair Verification

- ✅ System running with simulated odds
- ✅ Mapper validated and ready
- ✅ Infrastructure solid

### When Betfair Verifies You (24h - 1 week)

**Day 1 (Verification Approved):**

1. Get Betfair app key
2. Create session token
3. Deploy Step 1-2 above
4. Test with `scripts/test-mapper.ts`

**Day 2 (Live Testing):**

1. Update settlement endpoint
2. Deploy to production
3. Monitor metrics for 30 mins
4. Verify CLV calculating from real odds

**Day 3+ (Production):**

- System runs with real market data
- CLV now reflects actual edge
- 14-day validation begins

---

## 🧠 Safety Checks

Before going live, verify:

```typescript
// 1. Mapping success rate > 95%
if (batchResult.summary.matchRate < 0.95) {
  throw new Error('Mapping too unreliable')
}

// 2. Confidence scores > 0.8
if (mapResult.confidence < 0.8) {
  throw new Error('Low confidence match')
}

// 3. No duplicate settlements
const settled = await supabase
  .from('predictions')
  .select('id')
  .eq('settled', true)

if (settled.data.length > 0) {
  // Already settled, skip
  continue
}
```

---

## 📊 Monitoring

Once live, watch these:

```javascript
// 1. Match rate (should stay 95%+)
const matchRate = matched / total

// 2. Average confidence (should stay >0.85)
const avgConfidence = matched.reduce((a, m) => a + m.confidence) / matched.length

// 3. CLV distribution (should be stable)
const clvStats = predictions.map(p => p.clv).reduce(...)

// 4. Settlement success (should be 100%)
const settlementRate = (settled - failed) / settled
```

---

## ⚠️ Common Pitfalls

### ❌ Don't

- Call API on every prediction (batch instead)
- Ignore confidence scores (filter to >0.75)
- Settle duplicates (check `settled == false`)
- Use cached markets > 5 mins old

### ✅ Do

- Cache market list for 5 mins
- Log all unmapped predictions
- Monitor match rates continuously
- Test failover to simulated odds

---

## 🔄 Fallback Strategy

If Betfair API fails:

```typescript
async function getClosingOdds(prediction) {
  try {
    return await betfairOdds(prediction)
  } catch (err) {
    console.warn('Betfair API failed, falling back to simulation')
    return simulatedOdds(prediction)
  }
}
```

---

## ✅ Checklist for Go-Live

- [ ] Betfair app key created
- [ ] Session token working
- [ ] Mapper test suite passing (10/10)
- [ ] Integration code reviewed
- [ ] Test settlement working
- [ ] Metrics displaying real CLV
- [ ] Failover strategy ready
- [ ] Logging in place
- [ ] Performance baseline measured

---

## 💬 When You're Ready

Tell me:

> "verified"

And I'll:

1. ✅ Wire up `betfair-service.ts`
2. ✅ Create `odds-service.ts`
3. ✅ Update settlement endpoint
4. ✅ Deploy to production
5. ✅ Monitor first 30 mins with you

You'll be live within 2 hours.

---

**Current Status:** 🟡 Awaiting Betfair Verification

**Mapper Status:** ✅ Complete & Tested

**System Status:** ✅ Ready to upgrade
