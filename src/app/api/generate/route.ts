import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * /api/generate
 * 
 * LOCKED INPUT FORMAT (NO EXCEPTIONS):
 * {
 *   "event": string,
 *   "market": string,
 *   "modelProbability": number (0-1),
 *   "oddsTaken": number (1.0+),
 *   "timestamp": ISO string
 * }
 * 
 * Edge gate: (modelProbability * oddsTaken) > 1
 * Rejects all predictions with no positive edge.
 * 
 * This is the ONLY accepted format.
 * No optional fields. No manual overrides. No cheating.
 */
type PredictionInput = {
  event: string;
  market: string;
  modelProbability: number;
  oddsTaken: number;
  timestamp: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      event,
      market,
      modelProbability,
      oddsTaken,
      timestamp
    } = body as PredictionInput;

    // 🚫 HARD VALIDATION (reject contaminated data)
    if (!event || typeof event !== 'string' || event.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid event: must be non-empty string' },
        { status: 400 }
      );
    }

    if (!market || typeof market !== 'string' || market.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid market: must be non-empty string' },
        { status: 400 }
      );
    }

    if (typeof modelProbability !== 'number' || modelProbability < 0 || modelProbability > 1) {
      return NextResponse.json(
        { error: 'Invalid modelProbability: must be 0-1' },
        { status: 400 }
      );
    }

    if (typeof oddsTaken !== 'number' || oddsTaken < 1) {
      return NextResponse.json(
        { error: 'Invalid oddsTaken: must be >= 1.0' },
        { status: 400 }
      );
    }

    if (!timestamp || typeof timestamp !== 'string') {
      return NextResponse.json(
        { error: 'Invalid timestamp: must be ISO string' },
        { status: 400 }
      );
    }

    // Verify ISO timestamp is valid
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid timestamp: not valid ISO string' },
        { status: 400 }
      );
    }

    // 🎯 EDGE GATE (NON-NEGOTIABLE)
    // Only accept bets where model probability * odds > 1
    const edgeValue = modelProbability * oddsTaken;

    if (edgeValue <= 1) {
      return NextResponse.json({
        skipped: true,
        reason: 'No positive edge',
        edge: parseFloat(edgeValue.toFixed(4))
      });
    }

    // 📊 Calculate implied probability from odds
    const impliedProbability = 1 / oddsTaken;

    // 📊 INSERT INTO DATABASE
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        event: event.trim(),
        market: market.trim(),
        model_probability: modelProbability,
        odds_taken: oddsTaken,
        implied_probability: impliedProbability,
        edge: parseFloat(edgeValue.toFixed(4)),
        placed_at: new Date(timestamp).toISOString(),
        result: null,
        closing_odds: null,
        settled_at: null,
        clv: null
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to store prediction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prediction: {
        id: data?.[0]?.id,
        event,
        market,
        edge: parseFloat(edgeValue.toFixed(4)),
        modelProbability,
        impliedProbability: parseFloat(impliedProbability.toFixed(4))
      }
    });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
