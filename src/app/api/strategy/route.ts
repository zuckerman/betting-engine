import { NextRequest, NextResponse } from 'next/server';
import { StrategyEvolver } from '@/lib/strategy-evolution';
import { detectEdgeHealth } from '@/lib/edge-decay';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/strategy/generate
 * Generate new strategy variants based on edge health
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch recent and historical predictions
    const { data: recent } = await supabase
      .from('predictions')
      .select('clv')
      .not('closing_odds', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: all } = await supabase
      .from('predictions')
      .select('clv')
      .not('closing_odds', 'is', null)
      .order('created_at', { ascending: false });

    if (!recent || !all) {
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      );
    }

    // Detect edge health
    const edgeHealth = detectEdgeHealth(
      recent.map((p: any) => ({ clv: p.clv })),
      all.map((p: any) => ({ clv: p.clv }))
    );

    // Fetch active strategies
    const { data: strategies } = await supabase
      .from('strategies')
      .select('*')
      .in('status', ['active', 'shadow']);

    // Generate new variants
    const evolver = new StrategyEvolver();
    (strategies || []).forEach((s: any) => {
      evolver.addStrategy(s);
    });

    // Generate based on edge health
    const newVariants: any[] = [];
    const targetCount = Math.ceil(2 * edgeHealth.explorationMultiplier);

    for (let i = 0; i < targetCount; i++) {
      const variant = evolver.generateNewStrategy(
        strategies || [],
        edgeHealth
      );

      newVariants.push({
        ...variant,
        parameters: JSON.stringify(variant.parameters),
      });
    }

    // Store in database
    const { error: insertError } = await supabase
      .from('strategies')
      .insert(newVariants);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      generated: newVariants.length,
      edgeHealth,
      variants: newVariants.map((v) => ({
        id: v.id,
        name: v.name,
        parentId: v.parentId,
      })),
    });
  } catch (error) {
    console.error('Strategy generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate strategies', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/strategy/evaluate
 * Evaluate shadow strategies, promote if better than active
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { strategyId } = await request.json();

    // Get active strategy
    const { data: activeStrat } = await supabase
      .from('strategies')
      .select('*')
      .eq('status', 'active')
      .single();

    if (!activeStrat) {
      return NextResponse.json(
        { error: 'No active strategy' },
        { status: 400 }
      );
    }

    // Get candidate strategy
    const { data: candidate } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (!candidate) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // Compare CLV
    const improvement =
      candidate.performance?.avgCLV - activeStrat.performance?.avgCLV || 0;

    const shouldPromote =
      improvement > 0.01 &&
      (candidate.performance?.totalBets || 0) >= 50 &&
      (candidate.performance?.maxDrawdown || 0) <=
        (activeStrat.performance?.maxDrawdown || 0) * 1.5;

    if (shouldPromote) {
      // Promote candidate
      await supabase
        .from('strategies')
        .update({ status: 'archived' })
        .eq('status', 'active');

      await supabase
        .from('strategies')
        .update({
          status: 'active',
          promoted_at: new Date().toISOString(),
        })
        .eq('id', strategyId);

      return NextResponse.json({
        promoted: true,
        improvement: `+${(improvement * 100).toFixed(2)}%`,
        message: 'Strategy promoted to active',
      });
    }

    return NextResponse.json({
      promoted: false,
      improvement: `${improvement > 0 ? '+' : ''}${(improvement * 100).toFixed(2)}%`,
      reason:
        improvement <= 0.01
          ? 'Insufficient improvement'
          : 'Other guardrails not met',
    });
  } catch (error) {
    console.error('Strategy evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate strategy', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategy/status
 * Get current strategy portfolio status
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: strategies } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: false });

    const active = strategies?.find((s: any) => s.status === 'active');
    const shadows = strategies?.filter((s: any) => s.status === 'shadow') || [];
    const archived = strategies?.filter((s: any) => s.status === 'archived') || [];

    // Calculate portfolio health
    const totalScore = shadows.reduce(
      (sum, s: any) => sum + (s.performance?.avgCLV || 0),
      0
    );
    const diversity = shadows.length > 0 ? totalScore / shadows.length : 0;

    return NextResponse.json({
      activeStrategy: active ? {
        id: active.id,
        name: active.name,
        clv: active.performance?.avgCLV,
        roi: active.performance?.roi,
        bets: active.performance?.totalBets,
      } : null,
      shadows: shadows.map((s: any) => ({
        id: s.id,
        name: s.name,
        clv: s.performance?.avgCLV,
        bets: s.performance?.totalBets,
        age: s.created_at,
      })),
      stats: {
        activeShadows: shadows.length,
        retired: archived.length,
        portfolioDiversity: diversity,
        readyForPromotion: shadows.filter(
          (s: any) => (s.performance?.totalBets || 0) >= 50
        ).length,
      },
    });
  } catch (error) {
    console.error('Strategy status error:', error);
    return NextResponse.json(
      { error: 'Failed to get strategy status', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategy/{id}
 * Retire a strategy
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('id');

    if (!strategyId) {
      return NextResponse.json(
        { error: 'Strategy ID required' },
        { status: 400 }
      );
    }

    await supabase
      .from('strategies')
      .update({ status: 'archived' })
      .eq('id', strategyId);

    return NextResponse.json({ retired: strategyId });
  } catch (error) {
    console.error('Strategy retirement error:', error);
    return NextResponse.json(
      { error: 'Failed to retire strategy', details: String(error) },
      { status: 500 }
    );
  }
}
