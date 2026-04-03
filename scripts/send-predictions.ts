/**
 * PREDICTION SENDER
 * Transforms model output → API format → sends to /api/generate
 * 
 * Usage:
 *   npx ts-node scripts/send-predictions.ts
 */

import fetch from 'node-fetch';

// ============================================================================
// STEP 1: MODEL OUTPUT FORMAT (your model returns this)
// ============================================================================

interface ModelPrediction {
  fixture_id: string;
  home: string;
  away: string;
  market: string; // "over_2_5" | "under_2_5" | etc
  prob_over: number; // 0-1
  best_odds: number; // 1.0+
  timestamp: string; // ISO string
}

// ============================================================================
// STEP 2: ADAPTER (converts model → API format)
// ============================================================================

interface AdaptedPrediction {
  event: string;
  market: string;
  modelProbability: number;
  oddsTaken: number;
  timestamp: string;
}

function mapMarket(market: string): string {
  const mapping: Record<string, string> = {
    'over_2_5': 'Over 2.5 Goals',
    'under_2_5': 'Under 2.5 Goals',
  };
  return mapping[market] || market;
}

function adaptPrediction(model: ModelPrediction): AdaptedPrediction {
  return {
    event: `${model.home} vs ${model.away}`,
    market: mapMarket(model.market),
    modelProbability: model.prob_over,
    oddsTaken: model.best_odds,
    timestamp: model.timestamp,
  };
}

// ============================================================================
// STEP 3: VALIDATION (sanity checks)
// ============================================================================

function validatePrediction(pred: AdaptedPrediction): { valid: boolean; reason?: string } {
  if (pred.modelProbability <= 0 || pred.modelProbability >= 1) {
    return { valid: false, reason: 'Probability out of bounds [0,1]' };
  }
  if (pred.oddsTaken <= 1) {
    return { valid: false, reason: 'Odds must be > 1.0' };
  }
  if (!pred.event || !pred.market || !pred.timestamp) {
    return { valid: false, reason: 'Missing required fields' };
  }
  return { valid: true };
}

// ============================================================================
// STEP 4: SENDER
// ============================================================================

async function sendPrediction(
  adapted: AdaptedPrediction,
  apiUrl: string
): Promise<any> {
  try {
    const res = await fetch(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adapted),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    throw new Error(`Send failed: ${err.message}`);
  }
}

// ============================================================================
// STEP 5: ORCHESTRATOR
// ============================================================================

async function runPipeline(
  predictions: ModelPrediction[],
  apiUrl: string
) {
  console.log(`\n📊 Pipeline: ${predictions.length} predictions\n`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const pred of predictions) {
    try {
      // Adapt
      const adapted = adaptPrediction(pred);

      // Validate
      const validation = validatePrediction(adapted);
      if (!validation.valid) {
        console.log(`⏭️  SKIPPED: ${pred.fixture_id} (${validation.reason})`);
        skipped++;
        continue;
      }

      // Send
      const response = await sendPrediction(adapted, apiUrl);

      // Log result
      if (response.success) {
        console.log(
          `✅ SENT: ${pred.fixture_id} | event="${adapted.event}" | edge=${response.prediction?.edge || 'N/A'}`
        );
        sent++;
      } else if (response.skipped) {
        console.log(
          `⏭️  SKIPPED (API): ${pred.fixture_id} | reason="${response.reason}" | edge=${response.edge}`
        );
        skipped++;
      } else {
        console.log(`❌ FAILED: ${pred.fixture_id} | ${response.error || 'Unknown error'}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${pred.fixture_id} | ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📈 Results: ${sent} sent | ${skipped} skipped | ${failed} failed\n`);
}

// ============================================================================
// STEP 6: GET YOUR PREDICTIONS (FROM POISSON MODEL)
// ============================================================================

// 🔥 IMPORT YOUR ACTUAL MODEL HERE
// When you have real data source, replace this with:
// import { poissonModel } from '../src/lib/poisson/model';

// For now, using mock model output
// Replace getModelPredictions() when you have real team data

async function getModelPredictions(): Promise<ModelPrediction[]> {
  // 👇 EXAMPLE: How to call your Poisson model with real data
  // Once you have actual team strengths, uncomment and use:
  //
  // const predictions: ModelPrediction[] = [];
  // const fixtures = await getFixtures(); // your data source
  // 
  // for (const fixture of fixtures) {
  //   const output = poissonModel({
  //     homeTeam: fixture.homeTeam,
  //     awayTeam: fixture.awayTeam,
  //     leagueAvgGoals: 1.4
  //   });
  //   
  //   // Convert to over_2_5 probability
  //   const over25Prob = output.homeLambda + output.awayLambda > 2.5
  //     ? calculateOver25Probability(output)
  //     : 0.45;
  //   
  //   predictions.push({
  //     fixture_id: fixture.id,
  //     home: fixture.home,
  //     away: fixture.away,
  //     market: 'over_2_5',
  //     prob_over: over25Prob,
  //     best_odds: fixture.currentOdds,
  //     timestamp: new Date().toISOString()
  //   });
  // }
  // return predictions;
  
  // For testing with mock data:
  return [
    {
      fixture_id: '12345',
      home: 'Arsenal',
      away: 'Chelsea',
      market: 'over_2_5',
      prob_over: 0.58,
      best_odds: 1.92,
      timestamp: new Date().toISOString(),
    },
    {
      fixture_id: '12346',
      home: 'Man City',
      away: 'Liverpool',
      market: 'over_2_5',
      prob_over: 0.64,
      best_odds: 1.88,
      timestamp: new Date().toISOString(),
    },
  ];
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Determine API URL from environment or default
  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  console.log(`🚀 Starting prediction pipeline`);
  console.log(`📍 API: ${apiUrl}\n`);

  try {
    // Get predictions from model
    const predictions = await getModelPredictions();
    
    if (predictions.length === 0) {
      console.log('⚠️  No predictions returned from model');
      return;
    }

    // Send all predictions
    await runPipeline(predictions, apiUrl);

    console.log('✅ Pipeline complete');
  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
