import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// ─── GET /api/manager-odds ────────────────────────────────────────────────────
// Returns all managers with their full odds history attached.

export async function GET() {
  const supabase = getSupabaseAdmin();

  const [{ data: managers, error: mErr }, { data: odds, error: oErr }] = await Promise.all([
    supabase.from("managers").select("*").order("id"),
    supabase.from("manager_odds").select("*").order("recorded_at", { ascending: true }),
  ]);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const result = (managers ?? []).map((m) => ({
    ...m,
    odds: (odds ?? [])
      .filter((o) => o.manager_id === m.id)
      .map((o) => ({
        date: new Date(o.recorded_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        value: Number(o.odds_value),
        source: o.source,
        notes: o.notes ?? null,
      })),
  }));

  return NextResponse.json(result);
}

// ─── POST /api/manager-odds ───────────────────────────────────────────────────
// Appends a new odds snapshot. Auth-gated via service role + anon key check.
// Body: { manager_id: string; odds_value: number; source?: string; notes?: string }

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { manager_id, odds_value, source = "manual", notes } = body;

  if (!manager_id || odds_value == null) {
    return NextResponse.json(
      { error: "manager_id and odds_value are required" },
      { status: 400 }
    );
  }

  if (typeof odds_value !== "number" || odds_value <= 0) {
    return NextResponse.json(
      { error: "odds_value must be a positive number" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("manager_odds")
    .insert({ manager_id, odds_value, source, notes: notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
