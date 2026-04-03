import { NextRequest, NextResponse } from 'next/server';
import { calculateKelly, calculateCLV, simulateKellyOutcomes } from '@/lib/kelly';
import { BankrollTracker } from '@/lib/bankroll';
import { AdaptiveWeightsTracker, createSegmentId } from '@/lib/adaptive-weights';

/**
 * POST /api/staking/kelly - Calculate Kelly bet sizing
 * 
 * Body: {
 *   odds: number (decimal)
 *   predictedProbability: number (0-1)
 *   bankroll: number
 *   kellyFraction?: number (default 0.5 for half Kelly)
 * }
 * 
 * Returns: {
 *   recommendedStake: number
 *   kellyFraction: number (%)
 *   expectedValue: number
 *   riskOfRuin: number (%)
 *   edgePercentage: number (%)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      odds,
      predictedProbability,
      bankroll,
      kellyFraction = 0.5,
      closingOdds = odds, // For CLV calculation
    } = body;

    // Validate inputs
    if (!odds || predictedProbability === undefined || !bankroll) {
      return NextResponse.json(
        { error: 'Missing required fields: odds, predictedProbability, bankroll' },
        { status: 400 }
      );
    }

    if (predictedProbability < 0 || predictedProbability > 1) {
      return NextResponse.json(
        { error: 'predictedProbability must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Calculate Kelly sizing
    const kelly = calculateKelly({
      closingOdds,
      impliedProbability: predictedProbability,
      bankroll,
      kellyFraction,
    });

    // Calculate CLV for context
    const clv = calculateCLV(odds * 0.98, closingOdds); // Assume 2% vig at time of bet

    return NextResponse.json({
      recommendedStake: kelly.recommendedStake,
      kellyFraction: kelly.kellyFraction,
      expectedValue: kelly.expectedValue,
      riskOfRuin: kelly.riskOfRuin,
      edgePercentage: kelly.edgePercentage,
      clv,
      message:
        kelly.recommendedStake > 0
          ? `Bet £${kelly.recommendedStake} at ${odds} odds`
          : 'No edge detected - skip this bet',
    });
  } catch (error) {
    console.error('Kelly calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Kelly sizing' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staking/portfolio - Portfolio-level Kelly calculation
 * 
 * Body: {
 *   bankroll: number
 *   predictions: Array<{
 *     id: string
 *     odds: number
 *     probability: number
 *   }>
 *   kellyFraction?: number
 * }
 * 
 * Returns: Array of Kelly recommendations
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankroll, predictions, kellyFraction = 0.25 } = body;

    if (!bankroll || !predictions || predictions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: bankroll, predictions' },
        { status: 400 }
      );
    }

    const recommendations = predictions.map((pred: any) =>
      calculateKelly({
        closingOdds: pred.odds,
        impliedProbability: pred.probability,
        bankroll,
        kellyFraction,
      })
    );

    const totalRecommendedStake = recommendations.reduce(
      (sum, r) => sum + r.recommendedStake,
      0
    );

    const portfolioEV = recommendations.reduce(
      (sum, r) => sum + r.expectedValue,
      0
    );

    return NextResponse.json({
      recommendations,
      summary: {
        totalRecommendedStake,
        portfolioEV,
        averageStake: totalRecommendedStake / recommendations.length,
        averageRiskOfRuin: 
          recommendations.reduce((sum, r) => sum + r.riskOfRuin, 0) / recommendations.length,
      },
      warning:
        totalRecommendedStake > bankroll * 0.25
          ? 'Total recommended stakes exceed 25% of bankroll - consider reducing Kelly fraction'
          : undefined,
    });
  } catch (error) {
    console.error('Portfolio Kelly error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate portfolio Kelly' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staking/tracker - Get current bankroll tracker state
 * Query params: ?userId=...
 * 
 * Returns: {
 *   bankroll: number
 *   pnl: number
 *   roi: number
 *   drawdown: number
 *   constraints: { minBet, maxBet, maxConcurrentBets }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // In production, fetch user's bankroll from database
    // For now, return constraints for a hypothetical £1000 bankroll
    const bankroll = 1000;
    const tracker = new BankrollTracker(bankroll);
    const constraints = tracker.getKellyConstraints(2); // Risk 2% per bet

    return NextResponse.json({
      bankroll,
      state: tracker.getCurrentState(),
      constraints,
      simulation: tracker.simulateFuturePerformance(0.55, 2.0, 100), // 55% win rate, 2.0 avg odds
    });
  } catch (error) {
    console.error('Tracker error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tracker state' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/staking/weights - Get adaptive weight recommendations
 * 
 * Body: {
 *   segments: Array<{
 *     id: string (e.g., "EPL_BTTS")
 *     totalBets: number
 *     winningBets: number
 *     totalCLV: number
 *   }>
 * }
 * 
 * Returns: {
 *   weights: Record<string, number>
 *   recommendations: Array<{ segmentId, recommendedBets, reasoning }>
 *   expectedPortfolioEV: number
 *   weakSegments: Array<SegmentPerformance>
 *   strongSegments: Array<SegmentPerformance>
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { segments, numberOfBets = 100 } = body;

    if (!segments) {
      return NextResponse.json(
        { error: 'Missing required field: segments' },
        { status: 400 }
      );
    }

    const tracker = new AdaptiveWeightsTracker();

    // Initialize and load segment data
    tracker.initializeSegments(segments.map((s: any) => s.id));
    
    segments.forEach((seg: any) => {
      for (let i = 0; i < seg.totalBets; i++) {
        const won = i < seg.winningBets;
        const clv = seg.totalCLV / seg.totalBets;
        tracker.recordBetOutcome(seg.id, 2.0, won, clv);
      }
    });

    // Rebalance based on performance
    tracker.rebalanceWeights();

    const weakSegments = tracker.getWeakSegments();
    const strongSegments = tracker.getStrongSegments();

    return NextResponse.json({
      weights: tracker.getWeights(),
      recommendations: tracker.getNextNBetsAllocation(numberOfBets),
      expectedPortfolioEV: tracker.getExpectedPortfolioEV(),
      performanceStats: tracker.getPerformanceStats(),
      weakSegments: weakSegments.map((s) => ({
        id: s.segmentId,
        averageCLV: s.averageCLV,
        totalBets: s.totalBets,
        weight: s.weight,
      })),
      strongSegments: strongSegments.map((s) => ({
        id: s.segmentId,
        averageCLV: s.averageCLV,
        totalBets: s.totalBets,
        weight: s.weight,
      })),
    });
  } catch (error) {
    console.error('Adaptive weights error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate adaptive weights' },
      { status: 500 }
    );
  }
}
