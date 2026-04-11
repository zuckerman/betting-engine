"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { GeistMono } from "geist/font/mono"

// ── Decimal ↔ American odds conversion ───────────────────────────────────────

function decimalToAmerican(dec: number): string {
  if (!dec || dec < 1.01) return "—"
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`
  return `${Math.round(-100 / (dec - 1))}`
}

function americanToDecimal(american: string): number {
  const n = parseFloat(american)
  if (isNaN(n)) return 0
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1
}

// ── Expected Value maths ──────────────────────────────────────────────────────

/**
 * Remove the vig from a two-sided market to get fair (true) probability.
 * Standard approach: normalise each implied probability by their sum.
 * e.g. Sharp: -105 / -105 → implied 0.5125 each → sum 1.025 → fair = 0.5 each
 */
function noVigProb(oddsA: number, oddsB: number): { probA: number; probB: number; vig: number } {
  const implA = 1 / oddsA
  const implB = 1 / oddsB
  const total = implA + implB
  return {
    probA: parseFloat((implA / total).toFixed(4)),
    probB: parseFloat((implB / total).toFixed(4)),
    vig: parseFloat(((total - 1) * 100).toFixed(2)),
  }
}

type EVResult = {
  ev: number           // expected value in £
  evPct: number        // EV as % of stake
  isPositive: boolean
  fairProb: number     // no-vig win probability
  impliedProb: number  // implied win probability from your odds
  edge: number         // fairProb - impliedProb (our edge in prob terms)
  kellyStake: number   // optimal Kelly stake (full Kelly on £1000 bankroll)
  kellyFractional: number  // 25% Kelly (safer)
}

function calcEV(
  stake: number,
  yourOdds: number,       // the price you are getting
  sharpOddsYour: number,  // sharp book odds for same outcome (used to get fair prob)
  sharpOddsOther: number, // sharp book odds for the opposite outcome
  bankroll: number = 1000
): EVResult {
  const { probA: fairProb } = noVigProb(sharpOddsYour, sharpOddsOther)
  const impliedProb = 1 / yourOdds
  const profitIfWin = stake * (yourOdds - 1)
  const ev = fairProb * profitIfWin - (1 - fairProb) * stake
  const evPct = (ev / stake) * 100
  const edge = fairProb - impliedProb

  // Kelly criterion: edge / (odds - 1)
  const kellyFraction = edge > 0 ? Math.min(edge / (yourOdds - 1), 0.05) : 0
  const kellyStake = parseFloat((bankroll * kellyFraction / 0.25).toFixed(2))  // full Kelly
  const kellyFractional = parseFloat((bankroll * kellyFraction).toFixed(2))     // 25% Kelly

  return {
    ev: parseFloat(ev.toFixed(2)),
    evPct: parseFloat(evPct.toFixed(2)),
    isPositive: ev > 0,
    fairProb,
    impliedProb: parseFloat(impliedProb.toFixed(4)),
    edge: parseFloat((edge * 100).toFixed(2)),
    kellyStake: Math.max(0, kellyStake),
    kellyFractional: Math.max(0, kellyFractional),
  }
}

// ── Arb maths ──────────────────────────────────────────────────────────────

type ArbResult2Way = {
  impliedSum: number
  isArb: boolean
  profitPct: number
  stake1: number
  stake2: number
  profit: number
  returnIfWin1: number
  returnIfWin2: number
}

function calc2Way(odds1: number, odds2: number, totalStake: number): ArbResult2Way {
  const impliedSum = 1 / odds1 + 1 / odds2
  const isArb = impliedSum < 1
  const profitPct = ((1 / impliedSum) - 1) * 100

  // Stake each side proportionally so both outcomes return equal amount
  const stake1 = parseFloat(((totalStake / impliedSum) * (1 / odds1)).toFixed(2))
  const stake2 = parseFloat(((totalStake / impliedSum) * (1 / odds2)).toFixed(2))
  const returnIfWin1 = parseFloat((stake1 * odds1).toFixed(2))
  const returnIfWin2 = parseFloat((stake2 * odds2).toFixed(2))
  const profit = parseFloat((returnIfWin1 - totalStake).toFixed(2))

  return { impliedSum, isArb, profitPct, stake1, stake2, profit, returnIfWin1, returnIfWin2 }
}

type ArbResult3Way = {
  impliedSum: number
  isArb: boolean
  profitPct: number
  stakeHome: number
  stakeDraw: number
  stakeAway: number
  profit: number
  guaranteedReturn: number
}

function calc3Way(
  oddsHome: number,
  oddsDraw: number,
  oddsAway: number,
  totalStake: number
): ArbResult3Way {
  const impliedSum = 1 / oddsHome + 1 / oddsDraw + 1 / oddsAway
  const isArb = impliedSum < 1
  const profitPct = ((1 / impliedSum) - 1) * 100

  const stakeHome = parseFloat(((totalStake / impliedSum) * (1 / oddsHome)).toFixed(2))
  const stakeDraw = parseFloat(((totalStake / impliedSum) * (1 / oddsDraw)).toFixed(2))
  const stakeAway = parseFloat(((totalStake / impliedSum) * (1 / oddsAway)).toFixed(2))
  const guaranteedReturn = parseFloat((stakeHome * oddsHome).toFixed(2))
  const profit = parseFloat((guaranteedReturn - totalStake).toFixed(2))

  return { impliedSum, isArb, profitPct, stakeHome, stakeDraw, stakeAway, profit, guaranteedReturn }
}

// ── Hedge calculator (lock in profit on existing position) ───────────────────

type HedgeResult = {
  hedgeStake: number
  profit: number
  profitIfOriginalWins: number
  profitIfHedgeWins: number
  isLockIn: boolean   // true if both outcomes profitable
}

function calcHedge(
  originalStake: number,
  originalOdds: number,
  hedgeOdds: number
): HedgeResult {
  const originalReturn = originalStake * originalOdds
  // Optimal hedge: stake on other side so both outcomes return equal profit
  const hedgeStake = parseFloat((originalReturn / hedgeOdds).toFixed(2))
  const hedgeReturn = hedgeStake * hedgeOdds

  const profitIfOriginalWins = parseFloat((originalReturn - originalStake - hedgeStake).toFixed(2))
  const profitIfHedgeWins    = parseFloat((hedgeReturn - originalStake - hedgeStake).toFixed(2))
  const profit               = parseFloat(Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2))
  const isLockIn             = profitIfOriginalWins > 0 && profitIfHedgeWins > 0

  return { hedgeStake, profit, profitIfOriginalWins, profitIfHedgeWins, isLockIn }
}

// ── Live arbs from API ────────────────────────────────────────────────────────

type LiveArb = {
  homeTeam: string
  awayTeam: string
  kickoff: string
  league: string
  bestHome: { odds: number; bookmaker: string }
  bestDraw: { odds: number; bookmaker: string }
  bestAway: { odds: number; bookmaker: string }
  arbMargin: number
  arbStakes?: { homeStake: number; drawStake: number; awayStake: number; guaranteedProfit: number; profitPct: number }
}

// ── Component helpers ─────────────────────────────────────────────────────────

function OddsInput({
  label, value, onChange, bookmaker, onBookmakerChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  bookmaker?: string
  onBookmakerChange?: (v: string) => void
}) {
  const dec = parseFloat(value)
  const american = !isNaN(dec) && dec > 1 ? decimalToAmerican(dec) : "—"

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">{label}</div>
      <input
        type="number"
        min="1.01"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="2.10"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500 mb-2"
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">American: <span className="text-zinc-300">{american}</span></span>
        {onBookmakerChange !== undefined && (
          <input
            type="text"
            value={bookmaker || ""}
            onChange={e => onBookmakerChange(e.target.value)}
            placeholder="Bookmaker"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 w-28 focus:outline-none focus:border-zinc-500"
          />
        )}
      </div>
    </div>
  )
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "yellow" }) {
  const colors = {
    green:  "text-emerald-400",
    red:    "text-red-400",
    yellow: "text-yellow-400",
    undefined: "text-white",
  }
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className={`font-mono font-bold text-sm ${colors[highlight ?? "undefined"]}`}>{value}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = "2way" | "3way" | "hedge" | "ev"

export default function ArbCalculatorPage() {
  const [tab, setTab] = useState<Tab>("2way")
  const [totalStake, setTotalStake] = useState("100")

  // 2-way state
  const [odds1, setOdds1] = useState("")
  const [odds2, setOdds2] = useState("")
  const [book1, setBook1] = useState("")
  const [book2, setBook2] = useState("")

  // 3-way state
  const [oddsH, setOddsH] = useState("")
  const [oddsD, setOddsD] = useState("")
  const [oddsA, setOddsA] = useState("")
  const [bookH, setBookH] = useState("")
  const [bookD, setBookD] = useState("")
  const [bookA, setBookA] = useState("")

  // Hedge state
  const [origStake, setOrigStake] = useState("")
  const [origOdds, setOrigOdds] = useState("")
  const [hedgeOdds, setHedgeOdds] = useState("")
  const [hedgeBook, setHedgeBook] = useState("")

  // EV calculator state
  const [evStake, setEvStake] = useState("100")
  const [evYourOdds, setEvYourOdds] = useState("")
  const [evSharpYour, setEvSharpYour] = useState("")
  const [evSharpOther, setEvSharpOther] = useState("")
  const [evBankroll, setEvBankroll] = useState("1000")

  // Live arbs
  const [liveArbs, setLiveArbs] = useState<LiveArb[]>([])
  const [arbLoading, setArbLoading] = useState(false)
  const [liveTotalStake, setLiveTotalStake] = useState("100")

  const loadLiveArbs = useCallback(() => {
    setArbLoading(true)
    fetch("/api/line-shop?arb=true")
      .then(r => r.json())
      .then(d => setLiveArbs(d.fixtures || []))
      .catch(() => {})
      .finally(() => setArbLoading(false))
  }, [])

  useEffect(() => { loadLiveArbs() }, [loadLiveArbs])

  const stake = parseFloat(totalStake) || 100
  const o1 = parseFloat(odds1) || 0
  const o2 = parseFloat(odds2) || 0
  const oH = parseFloat(oddsH) || 0
  const oD = parseFloat(oddsD) || 0
  const oA = parseFloat(oddsA) || 0
  const oOrig = parseFloat(origOdds) || 0
  const oHedge = parseFloat(hedgeOdds) || 0
  const sOrig = parseFloat(origStake) || 0

  const result2 = o1 > 1 && o2 > 1 ? calc2Way(o1, o2, stake) : null
  const result3 = oH > 1 && oD > 1 && oA > 1 ? calc3Way(oH, oD, oA, stake) : null
  const resultH = sOrig > 0 && oOrig > 1 && oHedge > 1 ? calcHedge(sOrig, oOrig, oHedge) : null

  const evS  = parseFloat(evStake) || 100
  const evYO = parseFloat(evYourOdds) || 0
  const evSY = parseFloat(evSharpYour) || 0
  const evSO = parseFloat(evSharpOther) || 0
  const evBR = parseFloat(evBankroll) || 1000
  const resultEV = evS > 0 && evYO > 1 && evSY > 1 && evSO > 1
    ? calcEV(evS, evYO, evSY, evSO, evBR)
    : null

  const tabs: { id: Tab; label: string }[] = [
    { id: "ev",    label: "+EV Calculator" },
    { id: "2way",  label: "2-Way Arb" },
    { id: "3way",  label: "3-Way Arb" },
    { id: "hedge", label: "Hedge / Lock-In" },
  ]

  return (
    <div className={`min-h-screen bg-black text-white ${GeistMono.className}`}>
      {/* Nav */}
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-zinc-500 text-sm hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold mt-1">Arbitrage Calculator</h1>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/edge" className="hover:text-white">Line Shop</Link>
          <Link href="/performance/tracker" className="hover:text-white">P&L Tracker</Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">

        {/* Explainer */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Arbitrage betting locks in guaranteed profit by placing proportional bets on every outcome across different bookmakers.
            Because bookmakers set odds independently, they occasionally go "out of sync" — creating a window where combined implied
            probabilities sum to less than 100%. Our calculator tells you exactly how much to stake on each leg.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── EV CALCULATOR ── */}
        {tab === "ev" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Your Bet</h2>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Your Stake (£)</div>
                <input
                  type="number" min="1" value={evStake} onChange={e => setEvStake(e.target.value)}
                  placeholder="100"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500"
                />
              </div>
              <OddsInput label="Your odds (the price you are getting)" value={evYourOdds} onChange={setEvYourOdds} />

              <h2 className="text-base font-bold text-zinc-200 pt-2">Sharp Reference (Pinnacle)</h2>
              <p className="text-xs text-zinc-500 -mt-2">
                Enter Pinnacle&apos;s odds for both sides of the market. We remove the vig to find the true fair probability.
              </p>
              <OddsInput label="Pinnacle odds — same outcome as your bet" value={evSharpYour} onChange={setEvSharpYour} />
              <OddsInput label="Pinnacle odds — opposite outcome" value={evSharpOther} onChange={setEvSharpOther} />

              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Bankroll (£) — for Kelly stake</div>
                <input
                  type="number" min="1" value={evBankroll} onChange={e => setEvBankroll(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Expected Value</h2>
              {!resultEV ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500 text-sm">
                  Enter your odds and Pinnacle&apos;s odds to calculate EV
                </div>
              ) : (
                <div className={`rounded-xl border p-5 space-y-0 ${resultEV.isPositive ? "border-emerald-600/60 bg-emerald-900/10" : "border-red-700/50 bg-red-900/10"}`}>
                  <div className={`text-3xl font-bold mb-1 ${resultEV.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {resultEV.ev >= 0 ? "+" : ""}£{resultEV.ev}
                  </div>
                  <div className={`text-sm font-semibold mb-4 ${resultEV.isPositive ? "text-emerald-500" : "text-red-500"}`}>
                    {resultEV.isPositive ? "✓ POSITIVE EXPECTED VALUE (+EV)" : "✗ Negative Expected Value (−EV)"}
                  </div>

                  <ResultRow
                    label="Expected value per bet"
                    value={`${resultEV.ev >= 0 ? "+" : ""}£${resultEV.ev} (${resultEV.evPct >= 0 ? "+" : ""}${resultEV.evPct}%)`}
                    highlight={resultEV.isPositive ? "green" : "red"}
                  />
                  <ResultRow
                    label="Fair win probability (no-vig)"
                    value={`${(resultEV.fairProb * 100).toFixed(1)}%`}
                  />
                  <ResultRow
                    label="Implied probability (your odds)"
                    value={`${(resultEV.impliedProb * 100).toFixed(1)}%`}
                  />
                  <ResultRow
                    label="Edge (fair prob − implied prob)"
                    value={`${resultEV.edge >= 0 ? "+" : ""}${resultEV.edge}%`}
                    highlight={resultEV.edge >= 0 ? "green" : "red"}
                  />

                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Kelly Criterion Stakes</div>
                    <ResultRow
                      label="Full Kelly stake"
                      value={resultEV.kellyStake > 0 ? `£${resultEV.kellyStake}` : "£0 — no edge"}
                      highlight={resultEV.kellyStake > 0 ? "yellow" : undefined}
                    />
                    <ResultRow
                      label="25% Kelly (recommended)"
                      value={resultEV.kellyFractional > 0 ? `£${resultEV.kellyFractional}` : "£0 — no edge"}
                      highlight={resultEV.kellyFractional > 0 ? "green" : undefined}
                    />
                  </div>

                  {resultEV.isPositive && (
                    <div className="mt-4 bg-zinc-800/60 rounded-lg p-3 text-xs text-zinc-400">
                      <span className="text-zinc-200 font-semibold">Formula: </span>
                      EV = ({(resultEV.fairProb * 100).toFixed(1)}% × £{(evS * (evYO - 1)).toFixed(2)}) − ({((1 - resultEV.fairProb) * 100).toFixed(1)}% × £{evStake}) = <span className={resultEV.isPositive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>£{resultEV.ev}</span>
                    </div>
                  )}
                </div>
              )}

              {/* No-vig fair odds reference */}
              {evSY > 1 && evSO > 1 && (() => {
                const nv = noVigProb(evSY, evSO)
                const fairDecA = parseFloat((1 / nv.probA).toFixed(2))
                const fairDecB = parseFloat((1 / nv.probB).toFixed(2))
                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">No-Vig Fair Odds (Pinnacle Vig Removed)</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-zinc-500 mb-1">Your outcome</div>
                        <div className="font-mono font-bold text-white text-xl">{fairDecA}</div>
                        <div className="text-xs text-zinc-500">fair price ({(nv.probA * 100).toFixed(1)}%)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-zinc-500 mb-1">Opposite outcome</div>
                        <div className="font-mono font-bold text-white text-xl">{fairDecB}</div>
                        <div className="text-xs text-zinc-500">fair price ({(nv.probB * 100).toFixed(1)}%)</div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-zinc-500 mt-2">Pinnacle vig: {nv.vig}%</div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── 2-WAY ── */}
        {tab === "2way" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Enter Odds</h2>
              <OddsInput label="Outcome 1 (e.g. Team A to win)" value={odds1} onChange={setOdds1} bookmaker={book1} onBookmakerChange={setBook1} />
              <OddsInput label="Outcome 2 (e.g. Team B to win)" value={odds2} onChange={setOdds2} bookmaker={book2} onBookmakerChange={setBook2} />
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Stake (£)</div>
                <input
                  type="number"
                  min="1"
                  value={totalStake}
                  onChange={e => setTotalStake(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Result</h2>
              {!result2 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500 text-sm">Enter odds above to calculate</div>
              ) : (
                <div className={`rounded-xl border p-5 ${result2.isArb ? "border-emerald-600/60 bg-emerald-900/10" : "border-zinc-700 bg-zinc-900"}`}>
                  <div className={`text-xl font-bold mb-4 ${result2.isArb ? "text-emerald-400" : "text-red-400"}`}>
                    {result2.isArb ? "✓ ARBITRAGE EXISTS" : "✗ No Arbitrage"}
                  </div>
                  <ResultRow label="Implied probability sum" value={`${(result2.impliedSum * 100).toFixed(2)}%`} highlight={result2.isArb ? "green" : "red"} />
                  <ResultRow label="Profit margin" value={`${result2.profitPct.toFixed(2)}%`} highlight={result2.profitPct > 0 ? "green" : "red"} />

                  {result2.isArb && (
                    <>
                      <div className="mt-4 pt-4 border-t border-zinc-700 space-y-0">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Stake Breakdown</div>
                        <ResultRow
                          label={`Stake on Outcome 1${book1 ? ` (${book1})` : ""}`}
                          value={`£${result2.stake1}`}
                          highlight="yellow"
                        />
                        <ResultRow
                          label={`Stake on Outcome 2${book2 ? ` (${book2})` : ""}`}
                          value={`£${result2.stake2}`}
                          highlight="yellow"
                        />
                        <ResultRow label="Total staked" value={`£${(result2.stake1 + result2.stake2).toFixed(2)}`} />
                        <ResultRow label="Return if Outcome 1 wins" value={`£${result2.returnIfWin1}`} />
                        <ResultRow label="Return if Outcome 2 wins" value={`£${result2.returnIfWin2}`} />
                        <ResultRow label="Guaranteed profit" value={`+£${result2.profit}`} highlight="green" />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3-WAY ── */}
        {tab === "3way" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Enter Odds (Home / Draw / Away)</h2>
              <OddsInput label="Home Win" value={oddsH} onChange={setOddsH} bookmaker={bookH} onBookmakerChange={setBookH} />
              <OddsInput label="Draw" value={oddsD} onChange={setOddsD} bookmaker={bookD} onBookmakerChange={setBookD} />
              <OddsInput label="Away Win" value={oddsA} onChange={setOddsA} bookmaker={bookA} onBookmakerChange={setBookA} />
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Stake (£)</div>
                <input
                  type="number"
                  min="1"
                  value={totalStake}
                  onChange={e => setTotalStake(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Result</h2>
              {!result3 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500 text-sm">Enter all three odds above</div>
              ) : (
                <div className={`rounded-xl border p-5 ${result3.isArb ? "border-emerald-600/60 bg-emerald-900/10" : "border-zinc-700 bg-zinc-900"}`}>
                  <div className={`text-xl font-bold mb-4 ${result3.isArb ? "text-emerald-400" : "text-red-400"}`}>
                    {result3.isArb ? "✓ ARBITRAGE EXISTS" : "✗ No Arbitrage"}
                  </div>
                  <ResultRow label="Implied probability sum" value={`${(result3.impliedSum * 100).toFixed(2)}%`} highlight={result3.isArb ? "green" : "red"} />
                  <ResultRow label="Profit margin" value={`${result3.profitPct.toFixed(2)}%`} highlight={result3.profitPct > 0 ? "green" : "red"} />

                  {result3.isArb && (
                    <div className="mt-4 pt-4 border-t border-zinc-700 space-y-0">
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Stake Breakdown</div>
                      <ResultRow label={`Home${bookH ? ` (${bookH})` : ""}`} value={`£${result3.stakeHome}`} highlight="yellow" />
                      <ResultRow label={`Draw${bookD ? ` (${bookD})` : ""}`} value={`£${result3.stakeDraw}`} highlight="yellow" />
                      <ResultRow label={`Away${bookA ? ` (${bookA})` : ""}`} value={`£${result3.stakeAway}`} highlight="yellow" />
                      <ResultRow label="Total staked" value={`£${(result3.stakeHome + result3.stakeDraw + result3.stakeAway).toFixed(2)}`} />
                      <ResultRow label="Guaranteed return" value={`£${result3.guaranteedReturn}`} />
                      <ResultRow label="Guaranteed profit" value={`+£${result3.profit}`} highlight="green" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HEDGE / LOCK-IN ── */}
        {tab === "hedge" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Your Existing Bet</h2>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Original Stake (£)</div>
                <input
                  type="number"
                  min="0.01"
                  value={origStake}
                  onChange={e => setOrigStake(e.target.value)}
                  placeholder="50"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500"
                />
              </div>
              <OddsInput label="Original Odds (when you bet)" value={origOdds} onChange={setOrigOdds} />

              <h2 className="text-base font-bold text-zinc-200 pt-2">Hedge Bet</h2>
              <OddsInput label="Current odds on opposite outcome" value={hedgeOdds} onChange={setHedgeOdds} bookmaker={hedgeBook} onBookmakerChange={setHedgeBook} />

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500 space-y-1">
                <p className="font-semibold text-zinc-300">How hedging works:</p>
                <p>You placed £{origStake || "X"} on Team A at {origOdds || "X.XX"}.</p>
                <p>Team A is now winning. You can bet on the other side to guarantee a profit whatever happens.</p>
                <p>The calculator shows the exact hedge stake to equalise both outcomes.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-200">Result</h2>
              {!resultH ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500 text-sm">Enter your original bet details above</div>
              ) : (
                <div className={`rounded-xl border p-5 ${resultH.isLockIn ? "border-emerald-600/60 bg-emerald-900/10" : "border-yellow-700/50 bg-yellow-900/10"}`}>
                  <div className={`text-xl font-bold mb-4 ${resultH.isLockIn ? "text-emerald-400" : "text-yellow-400"}`}>
                    {resultH.isLockIn ? "✓ PROFIT LOCKED IN" : "⚠ Reduces Loss"}
                  </div>
                  <ResultRow label={`Hedge stake${hedgeBook ? ` (${hedgeBook})` : ""}`} value={`£${resultH.hedgeStake}`} highlight="yellow" />
                  <ResultRow label="Total invested" value={`£${(sOrig + resultH.hedgeStake).toFixed(2)}`} />
                  <ResultRow
                    label="If original bet wins"
                    value={`${resultH.profitIfOriginalWins >= 0 ? "+" : ""}£${resultH.profitIfOriginalWins}`}
                    highlight={resultH.profitIfOriginalWins >= 0 ? "green" : "red"}
                  />
                  <ResultRow
                    label="If hedge wins"
                    value={`${resultH.profitIfHedgeWins >= 0 ? "+" : ""}£${resultH.profitIfHedgeWins}`}
                    highlight={resultH.profitIfHedgeWins >= 0 ? "green" : "red"}
                  />
                  <ResultRow
                    label="Guaranteed minimum profit"
                    value={`${resultH.profit >= 0 ? "+" : ""}£${resultH.profit}`}
                    highlight={resultH.profit >= 0 ? "green" : "red"}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LIVE ARBS ── */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold">Live Arbitrage Scanner</h2>
              <p className="text-xs text-zinc-500 mt-1">Real-time arb opportunities across active leagues. Click any to load into the calculator.</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs text-zinc-500 mr-2">Stake £</span>
                <input
                  type="number"
                  value={liveTotalStake}
                  onChange={e => setLiveTotalStake(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white font-mono text-sm w-20 focus:outline-none"
                />
              </div>
              <button
                onClick={loadLiveArbs}
                className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                {arbLoading ? "Scanning…" : "↻ Refresh"}
              </button>
            </div>
          </div>

          {liveArbs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="text-zinc-500 text-sm">
                {arbLoading ? "Scanning bookmakers for arbitrage…" : "No live arbs found right now. Refresh to check again — arbs typically last 1–5 minutes."}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {liveArbs.map((arb, i) => {
                const ls = parseFloat(liveTotalStake) || 100
                const calc = arb.bestHome.odds && arb.bestDraw.odds && arb.bestAway.odds
                  ? calc3Way(arb.bestHome.odds, arb.bestDraw.odds, arb.bestAway.odds, ls)
                  : null

                return (
                  <div key={i} className="bg-zinc-900 border border-emerald-700/50 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-xs text-zinc-500">{arb.league} · {new Date(arb.kickoff).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="font-semibold text-white mt-0.5">{arb.homeTeam} vs {arb.awayTeam}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold text-lg">
                          {calc ? `+${calc.profitPct.toFixed(2)}%` : `${(Math.abs(arb.arbMargin) * 100).toFixed(2)}%`}
                        </div>
                        <div className="text-xs text-zinc-500">guaranteed profit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "HOME", data: arb.bestHome, stake: calc?.stakeHome },
                        { label: "DRAW", data: arb.bestDraw, stake: calc?.stakeDraw },
                        { label: "AWAY", data: arb.bestAway, stake: calc?.stakeAway },
                      ].map(({ label, data, stake }) => (
                        <div key={label} className="bg-zinc-800 rounded-lg p-2 text-center">
                          <div className="text-xs text-zinc-500 mb-1">{label}</div>
                          <div className="font-mono font-bold text-white">{data.odds.toFixed(2)}</div>
                          <div className="text-xs text-zinc-400">{data.bookmaker}</div>
                          {stake !== undefined && (
                            <div className="text-xs text-emerald-400 font-semibold mt-1">£{stake}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {calc && (
                      <div className="flex justify-between items-center text-sm bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-3 py-2">
                        <span className="text-zinc-400">Stake £{ls} total → guaranteed return</span>
                        <span className="text-emerald-400 font-bold font-mono">£{calc.guaranteedReturn} (+£{calc.profit})</span>
                      </div>
                    )}

                    {/* Load into calculator button */}
                    <button
                      onClick={() => {
                        setTab("3way")
                        setOddsH(arb.bestHome.odds.toString())
                        setOddsD(arb.bestDraw.odds.toString())
                        setOddsA(arb.bestAway.odds.toString())
                        setBookH(arb.bestHome.bookmaker)
                        setBookD(arb.bestDraw.bookmaker)
                        setBookA(arb.bestAway.bookmaker)
                        setTotalStake(liveTotalStake)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className="mt-2 w-full py-1.5 text-xs font-semibold text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Load into 3-Way Calculator ↑
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Risk warning */}
        <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
          Arb opportunities typically last 1–5 minutes before lines adjust. Account for withdrawal limits, account restrictions,
          and rounding on stake sizes. Use multiple bookmakers to avoid getting limited for arbing.
        </div>

      </div>
    </div>
  )
}
