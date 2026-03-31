/**
 * Odds Snapshot Endpoint
 * 
 * Captures market odds at specific timestamps
 * Enables detection of:
 * - Market movement
 * - Timing edge
 * - Sharp money flow
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchId, odds } = body;

    if (!matchId || odds === undefined) {
      return Response.json(
        {
          success: false,
          error: 'Missing matchId or odds',
        },
        { status: 400 }
      );
    }

    // Insert snapshot
    const { data, error } = await supabase.from('odds_snapshots').insert({
      match_id: matchId,
      odds: odds,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Odds snapshot recorded',
      data,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve odds snapshots for a match
 * Query: ?matchId=xxx to get snapshots for specific match
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return Response.json(
        { success: false, error: 'Missing matchId query param' },
        { status: 400 }
      );
    }

    // Get all snapshots for this match
    const { data: snapshots, error } = await supabase
      .from('odds_snapshots')
      .select('*')
      .eq('match_id', matchId)
      .order('timestamp', { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate market movement
    if (!snapshots || snapshots.length < 2) {
      return Response.json({
        success: true,
        matchId,
        snapshotCount: snapshots?.length || 0,
        movement: 'Insufficient data',
      });
    }

    const firstOdds = snapshots[0].odds;
    const latestOdds = snapshots[snapshots.length - 1].odds;
    const movement = latestOdds - firstOdds;
    const movementPct = ((movement / firstOdds) * 100).toFixed(2);

    return Response.json({
      success: true,
      matchId,
      snapshotCount: snapshots.length,
      firstOdds,
      latestOdds,
      movement: parseFloat(movement.toFixed(4)),
      movementPct: parseFloat(movementPct as string),
      snapshots,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
