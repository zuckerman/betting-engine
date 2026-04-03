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
 *   "fixture_id": string,
 *   "home": string,
 *   "away": string,
 *   "market": string,
 *   "modelProbability": number (0-1),
 *   "oddsTaken": number (1.0+),
 *   "timestamp": ISO string (prediction time),
 *   "kickoff": ISO string (event start time)
 * }
 * 
 * Edge gate: (modelProbability * oddsTaken) > 1
 * Rejects all predictions with no positive edge.
 * 
 * This is the ONLY accepted format.
 * No optional fields. No manual overrides. No cheating.
 */
type PredictionInput = {
  fixture_id: string;
  home: string;
  away: string;
  market: string;
  modelProbability: number;
  oddsTaken: number;
  timestamp: string;
  kickoff: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fixture_id,
      home,
      away,
      market,
      modelProbability,
      oddsTaken,
      timestamp,
      kickoff
    } = body as PredictionInput;

    // 🚫 HARD VALIDATION (reject contaminated data)
    if (!fixture_id || typeof fixture_id !== 'string' || fixture_id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid fixture_id: must be non-empty string' },
        { status: 400 }
      );
    }

    if (!home || typeof home !== 'string' || home.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid home: must be non-empty string' },
        { status: 400 }
      );
    }

    if (!away || typeof away !== 'string' || away.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid away: must be non-empty string' },
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

    if (!kickoff || typeof kickoff !== 'string') {
      return NextResponse.json(
        { error: 'Invalid kickoff: must be ISO string' },
        { status: 400 }
      );
    }

    // Verify both timestamps are valid
    const placedDate = new Date(timestamp);
    const kickoffDate = new Date(kickoff);
    if (isNaN(placedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid timestamp: not valid ISO string' },
        { status: 400 }
      );
    }
    if (isNaN(kickoffDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid kickoff: not valid ISO string' },
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
        match_id: fixture_id.trim(),
        home_team: home.trim(),
        away_team: away.trim(),
        market: market.trim(),
        model_probability: modelProbability,
        odds_taken: oddsTaken,
        implied_probability: impliedProbability,
        edge: parseFloat(edgeValue.toFixed(4)),
        placed_at: placedDate.toISOString(),
        kickoff_at: kickoffDate.toISOString(),
        event_start: kickoffDate.toISOString(),
        result: null,
        closing_odds: null,
        settled_at: null,
        clv: null,
        settled: false
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: `DB Error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prediction: {
        id: data?.[0]?.id,
        event: `${home} vs ${away}`,
        market,
        edge: parseFloat(edgeValue.toFixed(4)),
        modelProbability,
        impliedProbability: parseFloat(impliedProbability.toFixed(4)),
        kickoff
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
