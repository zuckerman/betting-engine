import { NextRequest, NextResponse } from 'next/server';
import { trainOnBatch, getDefaultWeights, getFeatureImportance } from '@/lib/meta-model';
import {
  updateCalibration,
  getCalibrationError,
  getCalibrationIssues,
} from '@/lib/calibration';
import { detectRegime } from '@/lib/market-regime';
import { createModelVersion, updateModelMetrics, compareModels } from '@/lib/model-version';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/train
 * 
 * Cron endpoint (runs daily at 2 AM UTC)
 * Retrains all models, updates calibration, creates new model version
 * 
 * Vercel cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/train",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  // Verify it's actually from Vercel's cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. FETCH ALL PREDICTIONS WITH OUTCOMES
    console.log('📊 Fetching predictions...');
    const { data: predictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .not('closing_odds', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fetchError || !predictions) {
      return NextResponse.json(
        { error: 'Failed to fetch predictions', details: fetchError },
        { status: 500 }
      );
    }

    if (predictions.length < 50) {
      return NextResponse.json(
        { message: 'Insufficient data for training', bets: predictions.length },
        { status: 200 }
      );
    }

    console.log(`✓ Fetched ${predictions.length} predictions with outcomes`);

    // 2. UPDATE CALIBRATION
    console.log('🎯 Updating probability calibration...');
    const calibrationData = updateCalibration(
      predictions.map((p) => ({
        probability: p.probability,
        result: p.result === 'win' ? 'win' : 'loss',
        closingOdds: p.closing_odds,
        takenOdds: p.taken_odds,
        clv: (p.closing_odds - p.taken_odds) * (p.result === 'win' ? 1 : -1),
      }))
    );

    const calibError = getCalibrationError(calibrationData);
    const calibIssues = getCalibrationIssues(calibrationData);

    await supabase.from('system_metrics').upsert({
      id: 1,
      calibration_error: calibError,
      calibration_data: JSON.stringify(calibrationData),
      updated_at: new Date().toISOString(),
    });

    console.log(`✓ Calibration error: ${(calibError * 100).toFixed(2)}%`);

    // 3. TRAIN META-MODEL
    console.log('🧠 Training meta-model...');
    let weights = getDefaultWeights();
    const trainingBatch = predictions.slice(0, 300).map((p) => ({
      edge: p.edge || 0,
      odds: p.taken_odds,
      probability: p.probability,
      market: p.market,
      league: p.league,
      clv: (p.closing_odds - p.taken_odds) * (p.result === 'win' ? 1 : -1),
    }));

    for (let i = 0; i < 5; i++) {
      // Multiple passes for convergence
      weights = trainOnBatch({ predictions: trainingBatch }, weights, 0.005);
    }

    console.log('✓ Meta-model training complete');

    // 4. CALCULATE FEATURE IMPORTANCE
    console.log('📊 Computing feature importance...');
    const importance = getFeatureImportance({ predictions: trainingBatch });

    await supabase.from('feature_importance').upsert(
      Object.entries(importance).map(([feature, value]) => ({
        feature,
        value,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'feature' }
    );

    console.log('✓ Feature importance saved');

    // 5. DETECT MARKET REGIME
    console.log('📈 Detecting market regime...');
    const recentClvData = predictions
      .slice(0, 50)
      .map((p) => ({ clv: (p.closing_odds - p.taken_odds) * (p.result === 'win' ? 1 : -1) }));

    const allClvData = predictions.map((p) => ({
      clv: (p.closing_odds - p.taken_odds) * (p.result === 'win' ? 1 : -1),
    }));

    const regime = detectRegime(recentClvData, allClvData);

    await supabase.from('market_regime').upsert({
      id: 1,
      regime: regime.regime,
      avg_clv_recent: regime.avgClvRecent,
      avg_clv_all_time: regime.avgClvAllTime,
      trend: regime.trend,
      confidence: regime.confidence,
      updated_at: new Date().toISOString(),
    });

    console.log(`✓ Market regime: ${regime.regime} (CLV: ${(regime.avgClvRecent * 100).toFixed(2)}%)`);

    // 6. CREATE AND TEST NEW MODEL VERSION
    console.log('🚀 Creating new model version...');
    const newVersion = createModelVersion(
      'meta_model',
      Math.floor(Date.now() / 1000), // version number
      weights as Record<string, any>
    );

    // Calculate metrics for new version
    const testPredictions = predictions.slice(300, 400);
    if (testPredictions.length > 0) {
      const versionWithMetrics = updateModelMetrics(
        newVersion,
        testPredictions.map((p) => ({
          clv: (p.closing_odds - p.taken_odds) * (p.result === 'win' ? 1 : -1),
          result: p.result === 'win' ? 'win' : 'loss',
          stake: p.stake || 10,
          odds: p.taken_odds,
        }))
      );

      // Store model version
      await supabase.from('model_versions').insert({
        id: versionWithMetrics.id,
        name: 'meta_model',
        version: versionWithMetrics.version,
        status: 'shadow',
        weights: versionWithMetrics.weights,
        metrics: versionWithMetrics.metrics,
        tested_at: versionWithMetrics.testedAt,
      });

      console.log(
        `✓ New model version created: avg CLV ${(versionWithMetrics.metrics.avgCLV * 100).toFixed(2)}%`
      );

      // 7. COMPARE WITH CURRENT ACTIVE MODEL
      console.log('⚖️ Comparing with current model...');
      const { data: currentModel } = await supabase
        .from('model_versions')
        .select('*')
        .eq('status', 'active')
        .single();

      if (currentModel) {
        const comparison = compareModels(currentModel, versionWithMetrics);

        await supabase.from('model_comparisons').insert({
          id: `${newVersion.id}_vs_${currentModel.id}`,
          model1_id: currentModel.id,
          model2_id: versionWithMetrics.id,
          winner: comparison.winner,
          clv_difference: comparison.metrics.clvDifference,
          roi_difference: comparison.metrics.roiDifference,
          recommendation: comparison.recommendation,
          reasoning: comparison.reasoning,
          created_at: new Date().toISOString(),
        });

        console.log(`✓ Comparison: ${comparison.recommendation.toUpperCase()}`);

        // 8. AUTOMATIC PROMOTION IF APPROVED
        if (comparison.recommendation === 'promote') {
          console.log('🎉 Promoting new model...');
          versionWithMetrics.status = 'active';
          versionWithMetrics.promotedAt = new Date().toISOString();
          versionWithMetrics.promotionStatus = 'approved';

          // Archive old model
          await supabase
            .from('model_versions')
            .update({ status: 'archived' })
            .eq('status', 'active');

          // Activate new model
          await supabase
            .from('model_versions')
            .update({ status: 'active', promoted_at: new Date().toISOString() })
            .eq('id', versionWithMetrics.id);

          console.log('✓ Model promoted successfully');
        }
      }
    }

    // 9. SUMMARY REPORT
    const trainingReport = {
      timestamp: new Date().toISOString(),
      predictionsProcessed: predictions.length,
      calibrationError: `${(calibError * 100).toFixed(2)}%`,
      calibrationIssues: {
        overconfident: calibIssues.overconfident.length,
        underconfident: calibIssues.underconfident.length,
      },
      marketRegime: regime.regime,
      featureImportance: {
        top: Object.entries(importance)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`),
      },
      modelComparison: 'See model_versions table for details',
    };

    console.log('📋 Training report:', trainingReport);

    return NextResponse.json({
      success: true,
      report: trainingReport,
    });
  } catch (error) {
    console.error('Training pipeline error:', error);
    return NextResponse.json(
      { error: 'Training failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/train
 * Health check - shows last training run
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from('system_metrics')
      .select('*')
      .eq('id', 1)
      .single();

    return NextResponse.json({
      status: 'operational',
      lastTrained: data?.updated_at,
      calibrationError: data?.calibration_error,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
