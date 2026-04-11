'use client'

import { useState, useMemo } from "react";

// Overround ranges by market type. The book's edge cushion — your edge must exceed this.
const VIG_TABLE = [
  { market: "1X2 / Asian Handicap",    overround: "104–106%", vigPct: 4,  tier: "LOW",    note: "Sharpest market. Most efficient. When divergence exists here, it's real." },
  { market: "Over/Under 2.5 Goals",    overround: "106–108%", vigPct: 6,  tier: "LOW",    note: "Still liquid. Used by sharp money. Viable hunting ground." },
  { market: "BTTS",                    overround: "107–109%", vigPct: 7,  tier: "MEDIUM", note: "Reasonable. Check Pinnacle vs soft book gap before betting." },
  { market: "Over/Under Corners",      overround: "108–112%", vigPct: 9,  tier: "HIGH",   note: "Thinly traded. Book has more cushion. Edge must be larger." },
  { market: "First Half Goals",        overround: "108–112%", vigPct: 9,  tier: "HIGH",   note: "Props/specials. Benchmark adjusted +6–8% vs face implied probability." },
  { market: "First Goalscorer",        overround: "115–130%", vigPct: 20, tier: "VERY HIGH", note: "Do not bet without player-level frequency data that clearly beats the vig." },
  { market: "Anytime Scorer",          overround: "112–120%", vigPct: 14, tier: "VERY HIGH", note: "Same problem as FGS. Structurally hard to overcome." },
  { market: "Player Cards",            overround: "110–115%", vigPct: 11, tier: "HIGH",   note: "Referee data is the only edge. Without it, don't touch." },
];

const VIG_TIER_COLOR: Record<string, string> = {
  "LOW": "#00ff9d",
  "MEDIUM": "#7ab0d0",
  "HIGH": "#f5a623",
  "VERY HIGH": "#ff4d4d",
};

interface Edge {
  id: string;
  name: string;
  tag: string;
  league: string;
  teams: string;
  market: string;
  why: string;
  when: string;
  hypothesis: string;
  condition: string;
  outcome: string;
  benchmark: string;
  benchmarkPct: number;
  vigTier: string;
  overround: string;
  datasource: string;
  script?: string;
  status: "UNTESTED" | "TESTING" | "VALIDATED" | "KILLED";
  validatedEdge: number | null;
}

interface Bet {
  id: number;
  date: string;
  match: string;
  edge: string;
  market: string;
  odds: string;
  stake: string;
  result: string;
  closeOdds: string;
}

const EDGES: Edge[] = [
  {
    id: "01", name: "Set-Piece Specialists", tag: "CORNERS · GOALS", league: "PL",
    teams: "Arsenal · Newcastle · Leeds · Crystal Palace",
    market: "Team corners over / Scoring first / Team goals",
    why: "Arsenal score 41% of goals from set pieces. Corner conversion up ~5% this season. Dead-ball output follows the set-piece coach, not match form.",
    when: "Opponent plays high line or weak aerially. Key delivery player fit. Avoid compact low-block sides.",
    hypothesis: "Arsenal home matches produce set-piece goals at a rate that exceeds open-play-only implied pricing after vig.",
    condition: "Arsenal home, PL. Set-piece coach confirmed active.",
    outcome: "Goal from corner or direct free-kick",
    benchmark: "Needs player-level market data. Anytime scorer vig = 112–120%. Rate must clear ~82%+ before there's money.",
    benchmarkPct: 82,
    vigTier: "VERY HIGH",
    overround: "112–120%",
    datasource: "football-data.co.uk + manual set-piece tagging",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "02", name: "Corner Volume Leaders", tag: "CORNERS", league: "La Liga",
    teams: "Barcelona · Rayo Vallecano · Atletico Madrid",
    market: "Over total corners / Team corners over",
    why: "Barcelona average 11.39 corners/game vs league avg 9.61. Possession-dominant style generates corner volume regardless of scoreline.",
    when: "Home fixture vs mid-table or lower. Opponent not a disciplined low-block.",
    hypothesis: "Barcelona home matches exceed the corners market line at a rate that survives 108–112% overround.",
    condition: "Barcelona home, La Liga. Opponent ranked 10–20.",
    outcome: "Total corners > market line",
    benchmark: "Over corner line at ~1.87 = 53.5% implied. Add ~9% vig buffer → need ~62%+ actual rate.",
    benchmarkPct: 62,
    vigTier: "HIGH",
    overround: "108–112%",
    datasource: "football-data.co.uk (La Liga) — columns: HC, AC",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "03", name: "Bundesliga Structural Over", tag: "GOALS · BTTS", league: "Bundesliga",
    teams: "Bayern Munich · Bayer Leverkusen · Dortmund",
    market: "Over 2.5 goals / BTTS Yes",
    why: "Pressing and transition system creates open games structurally. 72% of matches with 10+ corners finish over 2.5.",
    when: "Two pressing-heavy teams. Bayern home. Avoid late-season relegation clashes.",
    hypothesis: "Bayern Munich home matches produce over 2.5 goals at a rate that beats implied + vig on the O2.5 market.",
    condition: "Bayern home, Bundesliga. Opponent outside top 4.",
    outcome: "Match finishes over 2.5 goals",
    benchmark: "O2.5 at ~1.60 = 62.5% implied. Add ~6% vig buffer → need ~68%+ actual rate.",
    benchmarkPct: 68,
    vigTier: "LOW",
    overround: "106–108%",
    datasource: "football-data.co.uk (D1.csv)",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "04", name: "First Half Over 0.5", tag: "GOALS", league: "PL",
    teams: "Arsenal (home) — test subject",
    market: "First half — over 0.5 goals",
    why: "High-press elite teams create early chances. FH markets are priced softer than FT. Lower variance than over 2.5.",
    when: "Top-6 home vs mid-table. Check team's H1 scoring frequency over last 15. Avoid cup rotation.",
    hypothesis: "Arsenal home matches produce ≥1 first-half goal at a rate that survives FH props vig of 108–112%.",
    condition: "Arsenal home, PL only. All opponents.",
    outcome: "HTHG + HTAG ≥ 1",
    benchmark: "FH over 0.5 at 1.35 = 74.1% implied. FH props overround ~108–112% → add ~8% vig buffer → REAL benchmark is ~80%.",
    benchmarkPct: 80,
    vigTier: "HIGH",
    overround: "108–112%",
    datasource: "football-data.co.uk — E0.csv — columns HTHG, HTAG",
    script: `import pandas as pd
from pathlib import Path

TEAM      = "Arsenal"
SEASONS   = {
  "2022/23": "E0_2223.csv",
  "2023/24": "E0_2324.csv",
  "2024/25": "E0_2425.csv",
}

# FH over 0.5 at 1.35 = 74.1% face implied.
# FH props overround is ~108-112%. Vig absorption ~8%.
# Real benchmark after margin: ~80%.
BENCHMARK_FACE = 0.741
BENCHMARK_REAL = 0.80

results = []
for season, fname in SEASONS.items():
    df   = pd.read_csv(Path(fname))
    home = df[df["HomeTeam"] == TEAM]
    n    = len(home)
    fh   = ((home["HTHG"] + home["HTAG"]) > 0).sum()
    rate = fh / n
    results.append({"season": season, "n": n, "fh": int(fh), "rate": rate})
    verdict = "PASS" if rate > BENCHMARK_REAL else ("MARGINAL" if rate > BENCHMARK_FACE else "FAIL")
    print(f"{season}  {fh}/{n} ({rate:.1%})  vs face:{rate-BENCHMARK_FACE:+.1%}  vs real:{rate-BENCHMARK_REAL:+.1%}  {verdict}")

total_n = sum(r["n"] for r in results)
total_f = sum(r["fh"] for r in results)
combined = total_f / total_n
print(f"\\nCOMBINED  {total_f}/{total_n} ({combined:.1%})")
print(f"  vs face benchmark (74.1%): {combined - BENCHMARK_FACE:+.1%}")
print(f"  vs real benchmark (80.0%): {combined - BENCHMARK_REAL:+.1%}")
if combined > BENCHMARK_REAL:
    print("HYPOTHESIS SURVIVES — edge clears vig")
elif combined > BENCHMARK_FACE:
    print("MARGINAL — beats face implied but vig likely eats the edge")
else:
    print("HYPOTHESIS KILLED")`,
    status: "TESTING", validatedEdge: null
  },
  {
    id: "05", name: "Away Clean Sheet — La Liga Top 2", tag: "BTTS", league: "La Liga",
    teams: "Real Madrid (away) · Barcelona (away)",
    market: "BTTS No",
    why: "Real Madrid concede only 3.54 corners/game. La Liga top sides have extreme away clean sheet rates vs bottom-6.",
    when: "Top-2 visiting bottom-6. Check opponent goals scored at home.",
    hypothesis: "Real Madrid away vs bottom-6 La Liga sides ends BTTS No at a rate exceeding implied + vig.",
    condition: "Real Madrid away. Opponent in bottom 6 at time of match.",
    outcome: "Match ends with ≥1 team failing to score",
    benchmark: "BTTS overround ~107–109%. Add ~7% to inverted BTTS Yes price to get real no-edge threshold.",
    benchmarkPct: 60,
    vigTier: "MEDIUM",
    overround: "107–109%",
    datasource: "football-data.co.uk (SP1.csv) — columns FTHG, FTAG",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "06", name: "Yellow Card Over — Press vs Block", tag: "CARDS", league: "All",
    teams: "Any high-press vs man-marking matchup",
    market: "Match cards over",
    why: "High-press vs compact physical defences produce bookings above average. Card markets are thinly modelled.",
    when: "Check referee cards-per-game average. Pressing team vs disciplined block.",
    hypothesis: "Matches where a high-press team faces a low-block side produce >3 yellow cards at above-market rates after vig.",
    condition: "Team pressing rank top-5 in league vs team defensive block rank bottom-5.",
    outcome: "Total yellow cards > market line",
    benchmark: "Cards overround ~110–115%. Significant. Referee tendency data is non-negotiable before touching this.",
    benchmarkPct: 65,
    vigTier: "HIGH",
    overround: "110–115%",
    datasource: "WhoScored referee data + football-data.co.uk (HY, AY columns)",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "07", name: "Set-Piece Header — Anytime Scorer", tag: "GOALS", league: "PL",
    teams: "Gabriel · Saliba · Botman · Onana",
    market: "Anytime scorer",
    why: "CBs who are primary aerial targets from corners are structurally underpriced in anytime scorer markets.",
    when: "Player confirmed starting. Team has high corner frequency. Opponent concedes aerially.",
    hypothesis: "Gabriel anytime scorer at offered odds returns positive EV relative to actual scoring frequency after vig.",
    condition: "Gabriel starts. Arsenal earn >5 corners per game average. Opponent bottom-half aerial defence.",
    outcome: "Gabriel scores at any point",
    benchmark: "Anytime scorer overround 112–120%. One of the worst markets for vig. Only survives with very large frequency edge.",
    benchmarkPct: 85,
    vigTier: "VERY HIGH",
    overround: "112–120%",
    datasource: "FBref.com — player-level goalscorer data",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "08", name: "Draw No Bet — Elite Away", tag: "RESULT", league: "PL · Bundesliga",
    teams: "Arsenal (away) · Bayern (away) · Liverpool (away)",
    market: "Draw no bet — away side",
    why: "Removes draw risk. Elite away sides win outright at a rate that can beat DNB implied probability.",
    when: "Top-3 visiting bottom-8. Away win rate >60% last 10. DNB odds >1.45.",
    hypothesis: "Arsenal away DNB returns positive EV over 3 seasons vs bottom-8 PL sides, net of 1X2 vig.",
    condition: "Arsenal away. Opponent bottom-8 at time of match.",
    outcome: "Arsenal win or stake returned (draw)",
    benchmark: "DNB derived from 1X2 market. Underlying vig ~104–106%. Best overround profile on this list.",
    benchmarkPct: 66,
    vigTier: "LOW",
    overround: "104–106%",
    datasource: "football-data.co.uk — E0.csv + odds columns (B365H etc.)",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "09", name: "Long Throw Zone", tag: "CORNERS · GOALS", league: "PL",
    teams: "Sunderland · Brentford · West Ham",
    market: "Over corners / Team goals",
    why: "Long throws into the box have more than doubled in 2025/26. Books haven't repriced corners markets.",
    when: "Home fixture. Long-throw specialist confirmed starting. Opponent weak aerially.",
    hypothesis: "Sunderland home matches produce more corners than the market line at a rate that survives corners vig.",
    condition: "Sunderland home. PL. Xhaka confirmed delivering set pieces.",
    outcome: "Sunderland team corners > market line",
    benchmark: "Corners overround 108–112%. Add ~9% to face implied before claiming edge exists.",
    benchmarkPct: 63,
    vigTier: "HIGH",
    overround: "108–112%",
    datasource: "football-data.co.uk (current season only — 2025/26)",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "10", name: "Relegation Six-Pointer BTTS", tag: "BTTS · GOALS", league: "PL",
    teams: "Bottom-6 clashes post matchday 25",
    market: "BTTS Yes / Over 2.5",
    why: "Desperate teams play open. Historical BTTS rate in late-season relegation clashes exceeds 62%.",
    when: "Both teams within 5 points of drop zone. Post matchday 25 only.",
    hypothesis: "PL relegation clashes post MD25 produce BTTS Yes at a rate that survives BTTS vig.",
    condition: "Both teams within 5pts of 18th. After MD25.",
    outcome: "Both teams score",
    benchmark: "BTTS overround ~107–109%. 62% historical rate is the raw number — need to verify it clears ~68% after margin.",
    benchmarkPct: 68,
    vigTier: "MEDIUM",
    overround: "107–109%",
    datasource: "football-data.co.uk + league table position at time of match",
    status: "UNTESTED", validatedEdge: null
  },
  {
    id: "11", name: "Scottish Premiership Corners", tag: "CORNERS", league: "SPL",
    teams: "Celtic · Rangers",
    market: "Over total corners / Team corners",
    why: "Scottish top flight is physical and set-piece heavy. Thinly traded = less efficient pricing. Gap-week edge.",
    when: "Celtic/Rangers home to bottom-8 SPL. PL/La Liga/Bundesliga blank weekends.",
    hypothesis: "Celtic home matches vs bottom-8 SPL exceed the corners line at a rate that survives corners vig — and SPL books may have wider lines.",
    condition: "Celtic home. Opponent in bottom 8 SPL. Market corners line available.",
    outcome: "Total corners > line",
    benchmark: "Corners overround 108–112%. SPL book may be softer, which could partially offset. Still need ~62%+ actual rate.",
    benchmarkPct: 62,
    vigTier: "HIGH",
    overround: "108–112%",
    datasource: "football-data.co.uk (SC0.csv — Scottish PL)",
    status: "UNTESTED", validatedEdge: null
  }
];

const SM = {
  UNTESTED:  { color: "#4a6a8a", bg: "#080e14", border: "#1a2d44", label: "UNTESTED",  note: "Hypothesis only. No data run." },
  TESTING:   { color: "#f5a623", bg: "#100e04", border: "#3a2a08", label: "TESTING",   note: "Script written. Awaiting output." },
  VALIDATED: { color: "#00ff9d", bg: "#040f08", border: "#1a4a2a", label: "VALIDATED", note: "Real data confirms edge." },
  KILLED:    { color: "#ff4d4d", bg: "#0f0404", border: "#3a1010", label: "KILLED",    note: "Hypothesis failed. Do not bet." },
} as const;

function VigTab() {
  return (
    <div>
      <div style={{ marginBottom: "14px" }}>
        <div style={{ color: "#00ff9d", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "4px" }}>MARKET VIG TABLE</div>
        <div style={{ color: "#4a6a8a", fontSize: "10px", lineHeight: 1.7 }}>
          The book&apos;s margin by market type. Your model edge must exceed vig absorption before there&apos;s money in the bet.
          Face implied probability is not the benchmark — <span style={{ color: "#f5a623" }}>face implied + vig buffer is.</span>
        </div>
      </div>

      <div style={{ background: "#060a0f", border: "1px solid #1a2d44", padding: "12px 16px", marginBottom: "14px" }}>
        <div style={{ color: "#2a5a7a", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "10px" }}>THREE HARD TRUTHS</div>
        {[
          ["High-vig markets have more book cushion by design.", "Corners, props, and scorer markets sit at 108–120% precisely because sharp money doesn't flow there. The book knows you can't hedge them efficiently."],
          ["If you find a real edge, your account gets killed.", "Gubbing is the exit condition. Model every validated edge with account lifetime: how many bets before restriction, what's total extractable value before closure."],
          ["Pinnacle close is the honest benchmark.", "If you can consistently beat Pinnacle's closing line, you have edge. If your model says you do but Pinnacle disagrees, your model is wrong. CLV vs Pinnacle > any backtest."],
        ].map(([title, body]) => (
          <div key={title} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #1a2d44" }}>
            <div style={{ color: "#c0d0e0", fontSize: "10px", marginBottom: "4px" }}>{title}</div>
            <div style={{ color: "#4a6a8a", fontSize: "10px", lineHeight: 1.7 }}>{body}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0a1018", border: "1px solid #161f2a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.6fr 0.6fr 2fr", padding: "7px 14px", borderBottom: "1px solid #161f2a", background: "#080d12" }}>
          {["MARKET TYPE", "OVERROUND", "VIG %", "TIER", "IMPLICATION"].map(h => (
            <div key={h} style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.1em" }}>{h}</div>
          ))}
        </div>
        {VIG_TABLE.map(row => (
          <div key={row.market} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.6fr 0.6fr 2fr", padding: "10px 14px", borderBottom: "1px solid #0d1520", alignItems: "start" }}>
            <div style={{ color: "#c0d0e0", fontSize: "10px" }}>{row.market}</div>
            <div style={{ color: "#7a9ab8", fontSize: "10px" }}>{row.overround}</div>
            <div style={{ color: VIG_TIER_COLOR[row.tier], fontSize: "10px", fontWeight: 500 }}>+{row.vigPct}%</div>
            <div>
              <span style={{ padding: "2px 6px", fontSize: "8px", color: VIG_TIER_COLOR[row.tier], border: `1px solid ${VIG_TIER_COLOR[row.tier]}30`, background: `${VIG_TIER_COLOR[row.tier]}08` }}>
                {row.tier}
              </span>
            </div>
            <div style={{ color: "#4a6a8a", fontSize: "9px", lineHeight: 1.6 }}>{row.note}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ background: "#040f08", border: "1px solid #00ff9d20", padding: "14px" }}>
          <div style={{ color: "#00ff9d", fontSize: "9px", letterSpacing: "0.12em", marginBottom: "8px" }}>OPTION A — ADJUST THE TESTS</div>
          <div style={{ color: "#4a8a6a", fontSize: "10px", lineHeight: 1.7 }}>
            Keep the corners/props hypotheses but recalculate every benchmark with real overround.<br /><br />
            Edge 04 benchmark: <span style={{ color: "#c0d0e0" }}>74.1% → 80%.</span><br />
            All 11 edges now have vig-adjusted benchmarks built in.
          </div>
        </div>
        <div style={{ background: "#0a0800", border: "1px solid #f5a62320", padding: "14px" }}>
          <div style={{ color: "#f5a623", fontSize: "9px", letterSpacing: "0.12em", marginBottom: "8px" }}>OPTION B — SHIFT TO LOW-VIG MARKETS</div>
          <div style={{ color: "#7a6030", fontSize: "10px", lineHeight: 1.7 }}>
            Migrate to 1X2 / Asian Handicap at 104–106% overround.<br /><br />
            Edges 03 and 08 (Bundesliga O2.5 and DNB Elite Away) are already in the right market tier. <span style={{ color: "#c0d0e0" }}>Run those next after 04.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EdgesTab() {
  const [sel, setSel] = useState<Edge | null>(EDGES.find(e => e.id === "04") || null);
  const [showScript, setShowScript] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const counts = { VALIDATED: 0, TESTING: 1, UNTESTED: 10, KILLED: 0 };
  const filtered = EDGES.filter(e => filterStatus === "ALL" || e.status === filterStatus);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "14px" }}>
        {(Object.entries(SM) as [keyof typeof SM, typeof SM[keyof typeof SM]][]).map(([k, v]) => (
          <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "ALL" : k)}
            style={{ background: v.bg, border: `1px solid ${filterStatus === k ? v.color + "80" : v.border}`, padding: "10px 14px", cursor: "pointer", opacity: filterStatus === "ALL" || filterStatus === k ? 1 : 0.4, transition: "opacity 0.1s" }}>
            <div style={{ color: v.color, fontSize: "20px", fontWeight: 600 }}>{counts[k]}</div>
            <div style={{ color: v.color, fontSize: "9px", letterSpacing: "0.12em", marginTop: "2px" }}>{v.label}</div>
            <div style={{ color: "#2a4a6a", fontSize: "9px", marginTop: "2px" }}>{v.note}</div>
          </div>
        ))}
      </div>

      <div style={{ color: "#2a4a6a", fontSize: "9px", padding: "8px 10px", background: "#06090d", border: "1px solid #1a2d44", marginBottom: "12px", letterSpacing: "0.08em" }}>
        RULE — Benchmark includes vig. Face implied probability is not the bar. Face implied + market overround absorption is.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "10px" }}>
        <div>
          {filtered.map(edge => {
            const s = SM[edge.status];
            const isSel = sel?.id === edge.id;
            return (
              <div key={edge.id} onClick={() => { setSel(isSel ? null : edge); setShowScript(false); }}
                style={{ background: isSel ? s.bg : "#0a1018", border: `1px solid ${isSel ? s.color + "60" : "#161f2a"}`, padding: "12px 14px", marginBottom: "5px", cursor: "pointer", transition: "all 0.1s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px" }}>
                  <div>
                    <span style={{ color: "#2a4a6a", fontSize: "9px", marginRight: "7px" }}>{edge.id}</span>
                    <span style={{ color: "#d0e0f0", fontSize: "12px" }}>{edge.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    {edge.status === "VALIDATED" && edge.validatedEdge !== null && (
                      <span style={{ color: "#00ff9d", fontSize: "12px", fontWeight: 600 }}>{edge.validatedEdge}%</span>
                    )}
                    <span style={{ padding: "2px 7px", fontSize: "8px", letterSpacing: "0.1em", color: s.color, border: `1px solid ${s.color}40`, background: s.bg }}>{s.label}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ background: "#111b26", color: "#5a8aaa", fontSize: "9px", padding: "1px 6px" }}>{edge.league}</span>
                  <span style={{ color: "#3a5a7a", fontSize: "9px" }}>{edge.tag}</span>
                  <span style={{ marginLeft: "auto", padding: "1px 6px", fontSize: "8px", color: VIG_TIER_COLOR[edge.vigTier], border: `1px solid ${VIG_TIER_COLOR[edge.vigTier]}25` }}>{edge.overround}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          {sel ? (
            <div style={{ background: SM[sel.status].bg, border: `1px solid ${SM[sel.status].color}40`, padding: "18px", position: "sticky", top: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <div style={{ color: "#3a6a9a", fontSize: "9px", letterSpacing: "0.14em", marginBottom: "5px" }}>{sel.tag} · {sel.league}</div>
                  <div style={{ color: "#e0f0ff", fontSize: "15px" }}>{sel.name}</div>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <span style={{ padding: "3px 7px", fontSize: "8px", color: VIG_TIER_COLOR[sel.vigTier], border: `1px solid ${VIG_TIER_COLOR[sel.vigTier]}40` }}>{sel.overround}</span>
                  <span style={{ padding: "3px 9px", fontSize: "8px", letterSpacing: "0.12em", color: SM[sel.status].color, border: `1px solid ${SM[sel.status].color}50`, background: SM[sel.status].bg }}>{sel.status}</span>
                </div>
              </div>

              {/* Vig-adjusted benchmark callout */}
              <div style={{ padding: "9px 12px", background: `${VIG_TIER_COLOR[sel.vigTier]}08`, border: `1px solid ${VIG_TIER_COLOR[sel.vigTier]}25`, marginBottom: "14px", display: "flex", gap: "16px", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.1em", marginBottom: "3px" }}>VIG TIER</div>
                  <div style={{ color: VIG_TIER_COLOR[sel.vigTier], fontSize: "11px", fontWeight: 600 }}>{sel.vigTier}</div>
                </div>
                <div>
                  <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.1em", marginBottom: "3px" }}>OVERROUND</div>
                  <div style={{ color: VIG_TIER_COLOR[sel.vigTier], fontSize: "11px", fontWeight: 600 }}>{sel.overround}</div>
                </div>
                <div>
                  <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.1em", marginBottom: "3px" }}>PASS THRESHOLD</div>
                  <div style={{ color: "#c0d0e0", fontSize: "11px", fontWeight: 600 }}>{sel.benchmarkPct}%+</div>
                </div>
              </div>

              {sel.status === "VALIDATED" && sel.validatedEdge !== null && (
                <div style={{ padding: "12px", background: "#020f06", border: "1px solid #00ff9d40", marginBottom: "14px" }}>
                  <div style={{ color: "#2a7a4a", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "4px" }}>VALIDATED EDGE — REAL DATA, NET OF VIG</div>
                  <div style={{ color: "#00ff9d", fontSize: "28px", fontWeight: 600 }}>{sel.validatedEdge}%</div>
                  <div style={{ color: "#2a6a4a", fontSize: "9px", marginTop: "4px" }}>Kelly Calc is now live for this edge.</div>
                </div>
              )}

              {([
                ["HYPOTHESIS", sel.hypothesis],
                ["CONDITION", sel.condition],
                ["OUTCOME", sel.outcome],
                ["BENCHMARK (VIG-ADJUSTED)", sel.benchmark],
                ["DATA SOURCE", sel.datasource],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} style={{ marginBottom: "11px" }}>
                  <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.12em", borderBottom: "1px solid #1a2a38", paddingBottom: "3px", marginBottom: "5px" }}>{label}</div>
                  <div style={{ color: "#7a9cb8", fontSize: "10px", lineHeight: 1.7 }}>{val}</div>
                </div>
              ))}

              {sel.status === "TESTING" && sel.script && (
                <div style={{ padding: "10px", background: "#0a0900", border: "1px solid #f5a62330", marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ color: "#8a6010", fontSize: "8px", letterSpacing: "0.12em" }}>TEST SCRIPT — VIG-ADJUSTED BENCHMARKS</div>
                    <button onClick={e => { e.stopPropagation(); setShowScript(!showScript); }}
                      style={{ background: "none", border: "1px solid #f5a62330", color: "#f5a623", padding: "3px 8px", cursor: "pointer", fontSize: "8px", fontFamily: "inherit", letterSpacing: "0.08em" }}>
                      {showScript ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <div style={{ color: "#6a5020", fontSize: "9px", lineHeight: 1.7 }}>
                    1. Download E0_2223.csv, E0_2324.csv, E0_2425.csv from football-data.co.uk/englandm.php<br />
                    2. Place in same folder as script<br />
                    3. Run: python3 test_fh04.py<br />
                    4. Script now outputs: vs face (74.1%) AND vs real (80%). Paste output back.
                  </div>
                  {showScript && (
                    <pre style={{ marginTop: "10px", padding: "10px", background: "#060500", border: "1px solid #2a1a00", color: "#b89040", fontSize: "9px", overflowX: "auto", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {sel.script}
                    </pre>
                  )}
                </div>
              )}

              {sel.status === "UNTESTED" && (
                <div style={{ padding: "10px", background: "#060a0f", border: "1px solid #1a2d44", marginTop: "4px" }}>
                  <div style={{ color: "#3a5a7a", fontSize: "9px", lineHeight: 1.7 }}>
                    Do not bet this. Do not build a script for this yet.<br />
                    Kill or validate Edge 04 first. Then work down by vig tier (LOW first).
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "#0a1018", border: "1px dashed #161f2a", padding: "50px", textAlign: "center" }}>
              <div style={{ color: "#2a4a6a", fontSize: "11px", letterSpacing: "0.15em" }}>SELECT AN EDGE</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KellyTab() {
  const [inp, setInp] = useState({ bankroll: "1000", odds: "1.38", modelProb: "", fraction: "0.5", overround: "110" });
  const noValidated = EDGES.filter(e => e.status === "VALIDATED").length === 0;

  const res = useMemo(() => {
    const { bankroll, odds, modelProb, fraction, overround } = inp;
    if (!bankroll || !odds || !modelProb) return null;
    const p = parseFloat(modelProb) / 100;
    const o = parseFloat(odds);
    const b = parseFloat(bankroll);
    const f = parseFloat(fraction);
    const or = parseFloat(overround) / 100;
    // True implied prob after removing vig
    const faceImpl = 1 / o;
    const vigBuffer = (or - 1) / 2; // simplified: half the overround above 100% attributed to this side
    const trueImpl = faceImpl * (1 / or);
    const edge = p - faceImpl;
    const edgeAfterVig = p - faceImpl - vigBuffer;
    if (edge <= 0) return { valid: false as const, faceImpl: (faceImpl * 100).toFixed(1), edge: (edge * 100).toFixed(2), edgeAfterVig: (edgeAfterVig * 100).toFixed(2), trueImpl: (trueImpl * 100).toFixed(1) };
    const kelly = (p * (o - 1) - (1 - p)) / (o - 1);
    const fk = kelly * f;
    return {
      valid: edgeAfterVig > 0 as boolean,
      marginal: edge > 0 && edgeAfterVig <= 0,
      edge: (edge * 100).toFixed(2),
      edgeAfterVig: (edgeAfterVig * 100).toFixed(2),
      faceImpl: (faceImpl * 100).toFixed(1),
      trueImpl: (trueImpl * 100).toFixed(1),
      stake: (fk * b).toFixed(2),
      fk: (fk * 100).toFixed(2),
      kelly: (kelly * 100).toFixed(2),
      cap: (b * 0.03).toFixed(0),
      ev: ((p * o - 1) * 100).toFixed(2),
    };
  }, [inp]);

  return (
    <div>
      <div style={{ color: "#00ff9d", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "4px" }}>KELLY STAKE CALCULATOR</div>

      {noValidated && (
        <div style={{ color: "#6a4a1a", background: "#100a02", border: "1px solid #f5a62330", padding: "10px 14px", fontSize: "10px", marginBottom: "16px", lineHeight: 1.6 }}>
          No validated edges yet. Kelly is illustrative only. Run Edge 04 test first. Model probability comes from test output, not intuition.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "#0a1018", border: "1px solid #161f2a", padding: "18px" }}>
          {([
            ["BANKROLL (£)", "bankroll", "1000"],
            ["BOOK ODDS (decimal)", "odds", "1.38"],
            ["MODEL PROBABILITY (%)", "modelProb", "from test output"],
          ] as [string, string, string][]).map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: "14px" }}>
              <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.12em", marginBottom: "5px" }}>{label}</div>
              <input style={{ background: "#060b10", border: "1px solid #1a2d44", color: "#c8d8e8", padding: "8px 10px", fontFamily: "inherit", fontSize: "12px", width: "100%", outline: "none" }}
                type="number" step="0.01" placeholder={ph}
                value={inp[key as keyof typeof inp]}
                onChange={e => setInp({ ...inp, [key]: e.target.value })} />
            </div>
          ))}

          <div style={{ marginBottom: "14px" }}>
            <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.12em", marginBottom: "5px" }}>MARKET OVERROUND (%)</div>
            <div style={{ display: "flex", gap: "5px", marginBottom: "6px" }}>
              {([["105", "1X2"], ["107", "O2.5"], ["108", "BTTS"], ["110", "Corners"], ["116", "Scorer"]] as [string, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setInp({ ...inp, overround: val })}
                  style={{ flex: 1, padding: "5px 3px", background: "none", border: `1px solid ${inp.overround === val ? "#f5a62360" : "#1a2d44"}`, color: inp.overround === val ? "#f5a623" : "#4a6a8a", cursor: "pointer", fontFamily: "inherit", fontSize: "8px" }}>
                  {label}<br /><span style={{ fontSize: "9px" }}>{val}%</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.12em", marginBottom: "7px" }}>FRACTION</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {([["0.25", "¼ Kelly"], ["0.5", "½ Kelly"], ["1", "Full"]] as [string, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setInp({ ...inp, fraction: val })}
                  style={{ flex: 1, padding: "7px", background: "none", border: `1px solid ${inp.fraction === val ? "#00ff9d50" : "#1a2d44"}`, color: inp.fraction === val ? "#00ff9d" : "#4a6a8a", cursor: "pointer", fontFamily: "inherit", fontSize: "9px" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {res ? (
            res.valid && !('marginal' in res && res.marginal) ? (
              <div style={{ background: "#040f07", border: "1px solid #1a4a2a", padding: "18px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ color: "#2a6a4a", fontSize: "8px", letterSpacing: "0.12em", marginBottom: "5px" }}>RECOMMENDED STAKE</div>
                  <div style={{ color: "#00ff9d", fontSize: "32px", fontWeight: 600 }}>£{res.stake}</div>
                  {res.stake && parseFloat(res.stake) > parseFloat(res.cap!) && (
                    <div style={{ color: "#f5a623", fontSize: "10px", marginTop: "4px" }}>Cap at £{res.cap} (3% bankroll rule)</div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                  {([
                    ["EDGE (FACE)", `+${res.edge}%`, "#c8d8e8"],
                    ["EDGE (AFTER VIG)", `+${res.edgeAfterVig}%`, "#00ff9d"],
                    ["FACE IMPLIED", `${res.faceImpl}%`, "#8ab0d0"],
                    ["EV per £100", `£${res.ev}`, "#6a9ac0"],
                  ] as [string, string, string][]).map(([label, val, color]) => (
                    <div key={label} style={{ background: "#020809", border: "1px solid #1a2d44", padding: "9px 11px" }}>
                      <div style={{ color: "#2a5a4a", fontSize: "8px", letterSpacing: "0.1em", marginBottom: "3px" }}>{label}</div>
                      <div style={{ color, fontSize: "13px", fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : 'marginal' in res && res.marginal ? (
              <div style={{ background: "#0a0800", border: "1px solid #f5a62340", padding: "24px" }}>
                <div style={{ color: "#f5a623", fontSize: "12px", marginBottom: "8px" }}>MARGINAL — VIG LIKELY EATS IT</div>
                <div style={{ color: "#7a6030", fontSize: "10px", lineHeight: 1.7, marginBottom: "12px" }}>
                  Beats face implied ({res.faceImpl}%) but vig absorption puts real edge at {res.edgeAfterVig}%.<br />
                  Do not bet unless this is Pinnacle-verified or the market is demonstrably soft.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                  <div style={{ background: "#060500", border: "1px solid #2a1a00", padding: "9px 11px" }}>
                    <div style={{ color: "#5a4020", fontSize: "8px", marginBottom: "3px" }}>FACE EDGE</div>
                    <div style={{ color: "#f5a623", fontSize: "13px" }}>+{res.edge}%</div>
                  </div>
                  <div style={{ background: "#060500", border: "1px solid #2a1a00", padding: "9px 11px" }}>
                    <div style={{ color: "#5a4020", fontSize: "8px", marginBottom: "3px" }}>AFTER VIG</div>
                    <div style={{ color: "#ff4d4d", fontSize: "13px" }}>{res.edgeAfterVig}%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#0f0404", border: "1px solid #3a1010", padding: "30px", textAlign: "center" }}>
                <div style={{ color: "#ff4d4d", fontSize: "13px", marginBottom: "8px" }}>NO EDGE</div>
                <div style={{ color: "#6a3a3a", fontSize: "10px" }}>Model prob ({inp.modelProb}%) does not beat face implied ({res.faceImpl}%). Do not bet.</div>
              </div>
            )
          ) : (
            <div style={{ background: "#0a1018", border: "1px dashed #161f2a", padding: "50px", textAlign: "center" }}>
              <div style={{ color: "#2a4a6a", fontSize: "11px", letterSpacing: "0.12em" }}>ENTER INPUTS</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BetLogTab() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [form, setForm] = useState({ match: "", edge: "", market: "", odds: "", stake: "", result: "PENDING", closeOdds: "" });
  const [open, setOpen] = useState(false);

  const add = () => {
    if (!form.match || !form.odds || !form.stake) return;
    setBets(p => [...p, { ...form, id: Date.now(), date: new Date().toLocaleDateString("en-GB") }]);
    setForm({ match: "", edge: "", market: "", odds: "", stake: "", result: "PENDING", closeOdds: "" });
    setOpen(false);
  };

  const update = (id: number, f: string, v: string) => setBets(p => p.map(b => b.id === id ? { ...b, [f]: v } : b));

  const totalStaked = bets.reduce((a, b) => a + (parseFloat(b.stake) || 0), 0);
  const totalReturn = bets.filter(b => b.result === "WIN").reduce((a, b) => a + (parseFloat(b.stake) || 0) * (parseFloat(b.odds) || 0), 0);
  const pnl = totalReturn - totalStaked;
  const clvBets = bets.filter(b => b.closeOdds && parseFloat(b.closeOdds));
  const avgCLV = clvBets.length ? (clvBets.reduce((a, b) => a + ((parseFloat(b.odds) - parseFloat(b.closeOdds)) / parseFloat(b.closeOdds)) * 100, 0) / clvBets.length).toFixed(2) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <div style={{ color: "#00ff9d", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "3px" }}>BET LOG + CLV</div>
          <div style={{ color: "#4a6a8a", fontSize: "10px" }}>Only log bets placed on TESTING or VALIDATED edges. CLV vs Pinnacle close is the honest benchmark.</div>
        </div>
        <button onClick={() => setOpen(!open)}
          style={{ background: "none", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", letterSpacing: "0.1em" }}>
          {open ? "— CANCEL" : "+ ADD BET"}
        </button>
      </div>

      {bets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px", marginBottom: "12px" }}>
          {([
            ["BETS", String(bets.length), "#8ab0d0"],
            ["P&L", `${pnl >= 0 ? "+" : ""}£${pnl.toFixed(2)}`, pnl >= 0 ? "#00ff9d" : "#ff4d4d"],
            ["AVG CLV", avgCLV !== null ? `${parseFloat(avgCLV) >= 0 ? "+" : ""}${avgCLV}%` : "—", avgCLV && parseFloat(avgCLV) > 0 ? "#00ff9d" : "#ff4d4d"],
            ["W / L", `${bets.filter(b => b.result === "WIN").length} / ${bets.filter(b => b.result === "LOSS").length}`, "#c8d8e8"],
          ] as [string, string, string][]).map(([label, val, color]) => (
            <div key={label} style={{ background: "#0a1018", border: "1px solid #161f2a", padding: "10px 14px" }}>
              <div style={{ color, fontSize: "18px", fontWeight: 600 }}>{val}</div>
              <div style={{ color: "#3a5a7a", fontSize: "8px", letterSpacing: "0.1em", marginTop: "3px" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={{ background: "#0a1018", border: "1px solid #1a3a5a", padding: "14px", marginBottom: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            {([["MATCH", "match", "Arsenal vs Chelsea"], ["EDGE ID", "edge", "04"], ["MARKET", "market", "FH over 0.5"]] as [string, string, string][]).map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ color: "#3a5a7a", fontSize: "8px", marginBottom: "4px" }}>{label}</div>
                <input style={{ background: "#060b10", border: "1px solid #1a2d44", color: "#c8d8e8", padding: "7px 9px", fontFamily: "inherit", fontSize: "11px", width: "100%", outline: "none" }}
                  placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            {([["ODDS TAKEN", "odds", "1.38"], ["STAKE (£)", "stake", "25"]] as [string, string, string][]).map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ color: "#3a5a7a", fontSize: "8px", marginBottom: "4px" }}>{label}</div>
                <input style={{ background: "#060b10", border: "1px solid #1a2d44", color: "#c8d8e8", padding: "7px 9px", fontFamily: "inherit", fontSize: "11px", width: "100%", outline: "none" }}
                  type="number" step="0.01" placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <button onClick={add} style={{ background: "none", border: "1px solid #00ff9d30", color: "#00ff9d", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", letterSpacing: "0.1em" }}>
            RECORD →
          </button>
        </div>
      )}

      {bets.length === 0 ? (
        <div style={{ background: "#0a1018", border: "1px dashed #161f2a", padding: "50px", textAlign: "center" }}>
          <div style={{ color: "#2a4a6a", fontSize: "11px", letterSpacing: "0.12em" }}>NO BETS YET</div>
          <div style={{ color: "#1a3a5a", fontSize: "9px", marginTop: "6px" }}>Log bets on TESTING or VALIDATED edges only</div>
        </div>
      ) : (
        <div style={{ background: "#0a1018", border: "1px solid #161f2a" }}>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 70px 55px 55px 65px 65px 80px 65px", padding: "6px 12px", borderBottom: "1px solid #161f2a", background: "#080d12" }}>
            {["DATE", "MATCH", "EDGE", "ODDS", "STAKE", "CLOSE", "CLV", "RESULT", "P&L"].map(h => (
              <div key={h} style={{ color: "#2a5a7a", fontSize: "8px", letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>
          {bets.map(bet => {
            const clv = bet.closeOdds && parseFloat(bet.closeOdds) ? (((parseFloat(bet.odds) - parseFloat(bet.closeOdds)) / parseFloat(bet.closeOdds)) * 100).toFixed(1) : null;
            const pnlBet = bet.result === "WIN" ? `+£${(parseFloat(bet.stake) * (parseFloat(bet.odds) - 1)).toFixed(2)}` : bet.result === "LOSS" ? `-£${bet.stake}` : "—";
            const pnlC = bet.result === "WIN" ? "#00ff9d" : bet.result === "LOSS" ? "#ff4d4d" : "#3a5a7a";
            return (
              <div key={bet.id} style={{ display: "grid", gridTemplateColumns: "70px 1fr 70px 55px 55px 65px 65px 80px 65px", padding: "7px 12px", borderBottom: "1px solid #111820", alignItems: "center" }}>
                <div style={{ color: "#3a5a7a", fontSize: "9px" }}>{bet.date}</div>
                <div style={{ color: "#c0d0e0", fontSize: "10px" }}>{bet.match}</div>
                <div style={{ color: "#5a8aaa", fontSize: "9px" }}>{bet.edge}</div>
                <div style={{ color: "#c0d0e0", fontSize: "10px", fontWeight: 500 }}>{bet.odds}</div>
                <div style={{ color: "#7a9ab8", fontSize: "10px" }}>£{bet.stake}</div>
                <div>
                  <input style={{ background: "transparent", border: "none", borderBottom: "1px solid #1a2d44", color: "#7a9ab8", fontSize: "9px", width: "52px", outline: "none", fontFamily: "inherit" }}
                    placeholder="—" value={bet.closeOdds} onChange={e => update(bet.id, "closeOdds", e.target.value)} />
                </div>
                <div style={{ color: clv === null ? "#3a5a7a" : parseFloat(clv) > 0 ? "#00ff9d" : "#ff4d4d", fontSize: "10px", fontWeight: 500 }}>
                  {clv !== null ? `${parseFloat(clv) > 0 ? "+" : ""}${clv}%` : "—"}
                </div>
                <div>
                  <select style={{ background: "#080d12", border: "none", color: "#7a9ab8", fontSize: "9px", fontFamily: "inherit", outline: "none" }}
                    value={bet.result} onChange={e => update(bet.id, "result", e.target.value)}>
                    {["PENDING", "WIN", "LOSS", "VOID"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ color: pnlC, fontSize: "10px", fontWeight: 500 }}>{pnlBet}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuantDashboard() {
  const [tab, setTab] = useState("edges");

  return (
    <div style={{ background: "#070b0f", minHeight: "100vh", color: "#c0d0e0", fontFamily: "'IBM Plex Mono','Courier New',monospace", fontSize: "13px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#0a1018}::-webkit-scrollbar-thumb{background:#1a3050}
        input[type=number]::-webkit-inner-spin-button{opacity:0}
        .live-dot{width:5px;height:5px;border-radius:50%;background:#f5a623;display:inline-block;margin-right:5px;animation:blink 1.5s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      `}</style>

      <div style={{ padding: "11px 22px", borderBottom: "1px solid #141e28", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#070b0f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#00ff9d", fontSize: "10px", letterSpacing: "0.2em", fontWeight: 600 }}>◈ EDGE//SYS</span>
          <span style={{ color: "#141e28" }}>|</span>
          <span style={{ color: "#3a5a7a", fontSize: "9px", letterSpacing: "0.1em" }}>HYPOTHESIS VALIDATION ENGINE</span>
        </div>
        <div style={{ display: "flex", gap: "14px" }}>
          <span style={{ fontSize: "9px", color: "#3a5a7a" }}>VALIDATED: 0</span>
          <span style={{ fontSize: "9px", color: "#3a5a7a" }}>KILLED: 0</span>
          <span style={{ fontSize: "9px" }}><span className="live-dot" />TESTING: 1</span>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #141e28", padding: "0 22px", background: "#070b0f", display: "flex" }}>
        {([["edges", "HYPOTHESIS REGISTER"], ["vig", "VIG TABLE"], ["kelly", "KELLY CALC"], ["bets", "BET LOG"]] as [string, string][]).map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", letterSpacing: "0.14em", padding: "9px 16px", color: tab === k ? "#00ff9d" : "#3a5a7a", borderBottom: tab === k ? "1px solid #00ff9d" : "1px solid transparent" }}>
            {v}
          </button>
        ))}
      </div>

      <div style={{ padding: "18px 22px", maxWidth: "1160px" }}>
        {tab === "edges" && <EdgesTab />}
        {tab === "vig" && <VigTab />}
        {tab === "kelly" && <KellyTab />}
        {tab === "bets" && <BetLogTab />}
      </div>

      <div style={{ padding: "9px 22px", borderTop: "1px solid #141e28", background: "#070b0f", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#1a3050", fontSize: "8px", letterSpacing: "0.1em" }}>EDGE//SYS · PERSONAL USE ONLY</span>
        <span style={{ color: "#1a3050", fontSize: "8px", letterSpacing: "0.1em" }}>0 VALIDATED EDGES · RUN EDGE 04 FIRST · VIG IS REAL</span>
      </div>
    </div>
  );
}
