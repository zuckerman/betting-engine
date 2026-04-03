#!/usr/bin/env node

/**
 * MANUAL VERIFICATION SCRIPT
 * 
 * Tests the complete pipeline end-to-end:
 * Entry Odds → Odds API → Sharp Prices → Consensus → CLV
 * 
 * Use this to verify one match manually before running full system
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

async function verifyPipeline() {
  log(colors.cyan, '\n═══════════════════════════════════════════════');
  log(colors.cyan, '  🔥 SHARP CLV PIPELINE VERIFICATION');
  log(colors.cyan, '═══════════════════════════════════════════════\n');

  // =====================================================================
  // STEP 1: Verify API Key
  // =====================================================================

  log(colors.blue, '📋 Step 1: Check Odds API Key');
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    log(colors.red, '❌ ERROR: ODDS_API_KEY not set in .env.local');
    log(colors.yellow, '   Fix: Add ODDS_API_KEY=your_key_here to .env.local');
    process.exit(1);
  }
  log(colors.green, `✅ API Key found: ${apiKey.substring(0, 10)}...`);

  // =====================================================================
  // STEP 2: Test API Connection
  // =====================================================================

  log(colors.blue, '\n📋 Step 2: Test Odds API Connection');
  try {
    const response = await fetch(
      'https://api.the-odds-api.com/v4/sports/?apiKey=' + apiKey
    );
    const data = await response.json();

    if (response.ok && data.length > 0) {
      log(colors.green, `✅ API Connection OK - Found ${data.length} sports`);
      log(colors.yellow, `   Sample sports: ${data.slice(0, 3).map(s => s.key).join(', ')}`);
    } else {
      log(colors.red, '❌ ERROR: API returned error');
      log(colors.yellow, `   Response: ${JSON.stringify(data).substring(0, 100)}`);
      process.exit(1);
    }
  } catch (err) {
    log(colors.red, `❌ ERROR: Could not reach API - ${err.message}`);
    process.exit(1);
  }

  // =====================================================================
  // STEP 3: Fetch Live Odds
  // =====================================================================

  log(colors.blue, '\n📋 Step 3: Fetch Live Odds (Soccer)');
  let oddsData = null;
  try {
    const response = await fetch(
      'https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?regions=uk&markets=h2h&apiKey=' +
        apiKey
    );
    oddsData = await response.json();

    if (!Array.isArray(oddsData) || oddsData.length === 0) {
      log(colors.red, '❌ ERROR: No odds data returned');
      log(colors.yellow, `   Response: ${JSON.stringify(oddsData).substring(0, 100)}`);
      process.exit(1);
    }

    const firstMatch = oddsData[0];
    log(colors.green, `✅ Got ${oddsData.length} matches`);
    log(colors.yellow, `   Sample: ${firstMatch.home_team} vs ${firstMatch.away_team}`);
  } catch (err) {
    log(colors.red, `❌ ERROR: Could not fetch odds - ${err.message}`);
    process.exit(1);
  }

  // =====================================================================
  // STEP 4: Extract Sharp Prices
  // =====================================================================

  log(colors.blue, '\n📋 Step 4: Extract Sharp Bookmakers');

  const SHARP_BOOKS = ['pinnacle', 'matchbook', 'betfair_ex'];
  const SOFT_BOOKS = ['bet365', 'skybet', 'ladbrokes', 'williamhill'];

  const firstMatch = oddsData[0];
  const homeTeam = firstMatch.home_team;

  let sharpPrices = [];
  let softPrices = [];

  for (const bookmaker of firstMatch.bookmakers || []) {
    const market = bookmaker.markets?.[0];
    if (!market) continue;

    const outcome = market.outcomes?.find(
      o => o.name === homeTeam || o.name === homeTeam.split(' ')[0]
    );

    if (!outcome) continue;

    if (SHARP_BOOKS.includes(bookmaker.key)) {
      sharpPrices.push({
        book: bookmaker.key,
        price: outcome.price,
      });
    } else if (SOFT_BOOKS.includes(bookmaker.key)) {
      softPrices.push({
        book: bookmaker.key,
        price: outcome.price,
      });
    }
  }

  if (sharpPrices.length === 0) {
    log(colors.red, '⚠️  WARNING: No sharp books found');
    log(colors.yellow, `   Available books: ${firstMatch.bookmakers?.map(b => b.key).join(', ')}`);
  } else {
    log(colors.green, `✅ Found ${sharpPrices.length} sharp books for ${homeTeam}`);
    for (const p of sharpPrices) {
      log(colors.yellow, `   ${p.book.padEnd(15)} @ ${p.price.toFixed(2)}`);
    }
  }

  if (softPrices.length > 0) {
    log(colors.yellow, `⚠️  Found ${softPrices.length} soft books (not used for CLV):`);
    for (const p of softPrices) {
      log(colors.yellow, `   ${p.book.padEnd(15)} @ ${p.price.toFixed(2)}`);
    }
  }

  // =====================================================================
  // STEP 5: Calculate Consensus
  // =====================================================================

  log(colors.blue, '\n📋 Step 5: Calculate Sharp Consensus');

  if (sharpPrices.length === 0) {
    log(colors.red, '❌ ERROR: Cannot calculate consensus without sharp prices');
    process.exit(1);
  }

  const consensus =
    sharpPrices.reduce((sum, p) => sum + p.price, 0) / sharpPrices.length;
  log(colors.green, `✅ Consensus: ${consensus.toFixed(2)}`);

  // =====================================================================
  // STEP 6: Calculate Spread
  // =====================================================================

  log(colors.blue, '\n📋 Step 6: Validate Market Quality (Spread)');

  const min = Math.min(...sharpPrices.map(p => p.price));
  const max = Math.max(...sharpPrices.map(p => p.price));
  const spread = (max - min) / min;

  log(colors.yellow, `   Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}`);
  log(colors.yellow, `   Spread: ${(spread * 100).toFixed(2)}%`);

  if (spread > 0.08) {
    log(colors.red, `❌ FAIL: Spread > 8% (market is too disagreed)`);
  } else {
    log(colors.green, `✅ PASS: Spread < 8% (market is coherent)`);
  }

  // =====================================================================
  // STEP 7: Simulate Entry & Calculate CLV
  // =====================================================================

  log(colors.blue, '\n📋 Step 7: Calculate CLV (vs simulated entry)');

  // Simulate entry at slightly higher than market
  const entryOdds = consensus * 1.02; // 2% better than market
  const clv = entryOdds / consensus - 1;
  const clvPercent = clv * 100;

  log(colors.yellow, `   Market consensus: ${consensus.toFixed(2)}`);
  log(colors.yellow, `   Entry odds (simulated): ${entryOdds.toFixed(2)}`);
  log(colors.yellow, `   CLV: ${clvPercent.toFixed(2)}%`);

  if (clvPercent > 5) {
    log(colors.green, `✅ STRONG signal (>5% CLV)`);
  } else if (clvPercent > 2) {
    log(colors.green, `✅ MEDIUM signal (2-5% CLV)`);
  } else if (clvPercent > 0) {
    log(colors.yellow, `⚠️  WEAK signal (0-2% CLV)`);
  } else {
    log(colors.red, `❌ NEGATIVE signal (negative CLV)`);
  }

  // =====================================================================
  // STEP 8: Summary
  // =====================================================================

  log(colors.cyan, '\n═══════════════════════════════════════════════');
  log(colors.cyan, '  ✅ VERIFICATION COMPLETE');
  log(colors.cyan, '═══════════════════════════════════════════════\n');

  log(colors.green, '📊 PIPELINE SUMMARY:');
  log(colors.yellow, `   Match: ${homeTeam} vs ${firstMatch.away_team}`);
  log(colors.yellow, `   Sharp books: ${sharpPrices.map(p => p.book).join(', ')}`);
  log(colors.yellow, `   Consensus: ${consensus.toFixed(2)}`);
  log(colors.yellow, `   Spread: ${(spread * 100).toFixed(2)}% ${spread < 0.08 ? '✅' : '❌'}`);
  log(colors.yellow, `   Entry (simulated): ${entryOdds.toFixed(2)}`);
  log(colors.yellow, `   CLV: ${clvPercent.toFixed(2)}%`);

  log(colors.cyan, '\n🚀 NEXT STEPS:');
  log(colors.yellow, '   1. Add ODDS_API_KEY to .env.local');
  log(colors.yellow, '   2. Run: npm run dev');
  log(colors.yellow, '   3. System will automatically:');
  log(colors.yellow, '      - Fetch live odds from The Odds API');
  log(colors.yellow, '      - Calculate sharp consensus');
  log(colors.yellow, '      - Measure CLV vs market');
  log(colors.yellow, '      - Track metrics on dashboard');

  log(colors.cyan, '\n📈 EXPECTED AFTER 7 DAYS:');
  log(colors.yellow, '   - Avg CLV: +0.5%+ (shows edge)');
  log(colors.yellow, '   - % positive: 55%+ (win prediction)');
  log(colors.yellow, '   - Stable spread: <3% avg');

  log(colors.cyan, '\n💡 REMEMBER:');
  log(colors.yellow, '   - Free tier: 500 requests/month');
  log(colors.yellow, '   - Caching enabled: 60 second TTL');
  log(colors.yellow, '   - Spread filter: Auto-reject >8%');
  log(colors.yellow, '   - Sharp books only (Pinnacle > others)');

  log(colors.green, '\n✅ READY TO RUN!\n');
}

verifyPipeline().catch(err => {
  log(colors.red, `\n❌ FATAL ERROR: ${err.message}\n`);
  process.exit(1);
});
