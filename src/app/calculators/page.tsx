"use client"

import { useState } from "react"
import Link from "next/link"
import { GeistMono } from "geist/font/mono"

// ═══════════════════════════════════════════════════════════════════════════
// MATHS UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function decToAmerican(dec: number): string {
  if (!dec || dec < 1.01) return "—"
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`
  return `${Math.round(-100 / (dec - 1))}`
}

function americanToDec(american: number): number {
  if (american > 0) return american / 100 + 1
  return 100 / Math.abs(american) + 1
}

function decToFractional(dec: number): string {
  if (!dec || dec < 1.01) return "—"
  const profit = dec - 1
  // Find simple fraction approximation
  const denom = 100
  const num   = Math.round(profit * denom)
  const g     = gcd(num, denom)
  return `${num / g}/${denom / g}`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function noVig2(oddsA: number, oddsB: number) {
  const i = 1/oddsA + 1/oddsB
  return { probA: (1/oddsA) / i, probB: (1/oddsB) / i, vig: (i - 1) * 100 }
}

// Poisson: P(X = k) = e^-λ * λ^k / k!
function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 1; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

function poissonCDF(lambda: number, k: number): number {
  let sum = 0
  for (let i = 0; i <= k; i++) sum += poissonPMF(lambda, i)
  return Math.min(1, sum)
}

// Combinations C(n, r)
function combinations(n: number, r: number): number {
  if (r > n) return 0
  if (r === 0 || r === n) return 1
  let result = 1
  for (let i = 0; i < r; i++) {
    result = result * (n - i) / (i + 1)
  }
  return Math.round(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5">{children}</div>
}

function NumInput({ value, onChange, placeholder, step = "0.01", min = "1.01" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string; min?: string
}) {
  return (
    <input
      type="number" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} step={step} min={min}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-zinc-500"
    />
  )
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: "green" | "red" | "yellow" }) {
  const border = highlight === "green" ? "border-emerald-600/50 bg-emerald-900/10"
    : highlight === "red"    ? "border-red-600/50 bg-red-900/10"
    : highlight === "yellow" ? "border-yellow-600/50 bg-yellow-900/10"
    : "border-zinc-800 bg-zinc-900"
  return <div className={`rounded-xl border p-5 ${border}`}>{children}</div>
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className={`font-mono font-bold text-sm ${color || "text-white"}`}>{value}</span>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BONUS BET CONVERTER
// ═══════════════════════════════════════════════════════════════════════════

function BonusBetCalc() {
  const [bonusSize, setBonusSize] = useState("100")
  const [bonusOdds, setBonusOdds] = useState("")
  const [hedgeOdds, setHedgeOdds] = useState("")

  const bs    = parseFloat(bonusSize) || 0
  const boDec = parseFloat(bonusOdds) || 0
  const hoDec = parseFloat(hedgeOdds) || 0
  const ready = bs > 0 && boDec > 1.01 && hoDec > 1.01

  // Bonus bets: win = profit only (stake not returned)
  // hedge_stake = bs × (boOdds - 1) / hoDec
  const hedgeStake   = ready ? parseFloat((bs * (boDec - 1) / hoDec).toFixed(2)) : 0
  const profitBonusWins = ready ? parseFloat((bs * (boDec - 1) - hedgeStake).toFixed(2)) : 0
  const profitHedgeWins = ready ? parseFloat((hedgeStake * (hoDec - 1)).toFixed(2)) : 0
  const conversionRate  = ready ? parseFloat(((profitBonusWins / bs) * 100).toFixed(1)) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Bonus bets don&apos;t return stake on a win. Hedge at another book to guarantee cash profit regardless of outcome.
        </p>
        <Section label="Bonus Bet Size (£/$)">
          <NumInput value={bonusSize} onChange={setBonusSize} placeholder="100" min="1" step="1" />
        </Section>
        <Section label="Bonus Bet Odds (decimal)">
          <NumInput value={bonusOdds} onChange={setBonusOdds} placeholder="4.00  (+300)" />
          {boDec > 1 && <div className="text-xs text-zinc-500 pt-1">American: {decToAmerican(boDec)}</div>}
        </Section>
        <Section label="Hedge Odds (decimal) — opposite outcome at another book">
          <NumInput value={hedgeOdds} onChange={setHedgeOdds} placeholder="1.36  (-275)" />
          {hoDec > 1 && <div className="text-xs text-zinc-500 pt-1">American: {decToAmerican(hoDec)}</div>}
        </Section>
      </div>

      <div className="space-y-4">
        <Card highlight={ready && conversionRate >= 70 ? "green" : ready ? "yellow" : undefined}>
          {!ready ? (
            <div className="text-zinc-500 text-sm">Enter bonus size and both odds to calculate</div>
          ) : (
            <>
              <div className={`text-3xl font-bold mb-1 ${conversionRate >= 70 ? "text-emerald-400" : "text-yellow-400"}`}>
                {conversionRate}% conversion
              </div>
              <div className="text-xs text-zinc-500 mb-4">
                {conversionRate >= 70 ? "Good conversion rate (≥70%)" : "Below 70% — look for better hedge odds"}
              </div>
              <Row label={`Hedge stake (at ${decToAmerican(hoDec)})`} value={`£${hedgeStake}`} color="text-yellow-400" />
              <Row label="Your real money at risk" value={`£${hedgeStake}`} />
              <Row label="Profit if bonus bet wins" value={`+£${profitBonusWins}`} color="text-emerald-400" />
              <Row label="Profit if hedge wins" value={`+£${profitHedgeWins}`} color="text-emerald-400" />
              <Row label="Guaranteed cash profit" value={`+£${Math.min(profitBonusWins, profitHedgeWins).toFixed(2)}`} color="text-emerald-400" />
              <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-500">
                Formula: hedge = bonus × (bonus_odds − 1) ÷ hedge_odds = {bs} × {(boDec - 1).toFixed(2)} ÷ {hoDec} = £{hedgeStake}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLD CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

function HoldCalc() {
  const [oddsA, setOddsA] = useState("")
  const [oddsB, setOddsB] = useState("")

  const oA = parseFloat(oddsA) || 0
  const oB = parseFloat(oddsB) || 0
  const ready = oA > 1 && oB > 1

  const impliedSum  = ready ? 1/oA + 1/oB : 0
  const hold        = ready ? (impliedSum - 1) * 100 : 0
  const nv          = ready ? noVig2(oA, oB) : null
  const fairDecA    = nv ? parseFloat((1 / nv.probA).toFixed(3)) : 0
  const fairDecB    = nv ? parseFloat((1 / nv.probB).toFixed(3)) : 0

  const holdColor = hold < 1 ? "text-emerald-400" : hold < 3 ? "text-yellow-400" : "text-red-400"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Market hold is the sportsbook&apos;s edge. Lower hold = better value. A 0% hold ("pick&apos;em") means perfectly fair odds.
        </p>
        <Section label="Best odds for Side A (decimal)">
          <NumInput value={oddsA} onChange={setOddsA} placeholder="2.00  (+100)" />
          {oA > 1 && <div className="text-xs text-zinc-500 pt-1">American: {decToAmerican(oA)} · Implied: {((1/oA)*100).toFixed(1)}%</div>}
        </Section>
        <Section label="Best odds for Side B (decimal)">
          <NumInput value={oddsB} onChange={setOddsB} placeholder="1.87  (-115)" />
          {oB > 1 && <div className="text-xs text-zinc-500 pt-1">American: {decToAmerican(oB)} · Implied: {((1/oB)*100).toFixed(1)}%</div>}
        </Section>
        <div className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1">
          <p className="text-zinc-400 font-semibold">Hold benchmarks:</p>
          <p>NBA / NFL main lines: 4–5% · NHL / MLB: 4–6%</p>
          <p>Niche leagues (KBO etc): 6–10%</p>
          <p>Pinnacle (sharpest): 2–3% · Exchanges (Betfair): 2–5%</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card highlight={!ready ? undefined : hold < 1 ? "green" : hold < 3 ? "yellow" : "red"}>
          {!ready ? (
            <div className="text-zinc-500 text-sm">Enter both sides to calculate hold</div>
          ) : (
            <>
              <div className={`text-3xl font-bold mb-1 ${holdColor}`}>{hold.toFixed(2)}% hold</div>
              <div className="text-xs text-zinc-500 mb-4">
                {hold < 0.1 ? "Essentially zero hold — excellent value" :
                  hold < 1 ? "Very low hold — very good market" :
                  hold < 3 ? "Reasonable hold" : "High hold — avoid if possible"}
              </div>
              <Row label="Side A implied probability" value={`${((1/oA)*100).toFixed(2)}%`} />
              <Row label="Side B implied probability" value={`${((1/oB)*100).toFixed(2)}%`} />
              <Row label="Combined implied" value={`${(impliedSum*100).toFixed(2)}%`} />
              <Row label="Market hold (juice)" value={`${hold.toFixed(2)}%`} color={holdColor} />
              {nv && (
                <>
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">No-Vig Fair Odds</div>
                    <Row label="Fair odds Side A" value={`${fairDecA} (${decToAmerican(fairDecA)})`} color="text-blue-300" />
                    <Row label="Fair odds Side B" value={`${fairDecB} (${decToAmerican(fairDecB)})`} color="text-blue-300" />
                    <Row label="Fair win prob A" value={`${(nv.probA * 100).toFixed(1)}%`} />
                    <Row label="Fair win prob B" value={`${(nv.probB * 100).toFixed(1)}%`} />
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PARLAY CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

function ParlayCalc() {
  const [legs, setLegs] = useState<string[]>(["", "", ""])
  const [stake, setStake] = useState("100")

  const addLeg    = () => setLegs(l => [...l, ""])
  const removeLeg = (i: number) => setLegs(l => l.filter((_, j) => j !== i))
  const setLeg    = (i: number, v: string) => setLegs(l => l.map((x, j) => j === i ? v : x))

  const decOdds  = legs.map(l => parseFloat(l) || 0).filter(o => o > 1)
  const allFilled = legs.every(l => parseFloat(l) > 1)
  const totalDec  = allFilled ? legs.reduce((p, l) => p * (parseFloat(l) || 1), 1) : 0
  const s         = parseFloat(stake) || 100
  const totalPayout = totalDec > 0 ? parseFloat((s * totalDec).toFixed(2)) : 0
  const totalProfit = totalDec > 0 ? parseFloat((totalPayout - s).toFixed(2)) : 0
  const winPct      = decOdds.length > 0
    ? decOdds.reduce((p, o) => p * (1/o), 1) * 100
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Enter decimal odds for each leg. All legs must win for the parlay to pay out.
        </p>
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <Section label={`Leg ${i + 1}`}>
                <NumInput value={leg} onChange={v => setLeg(i, v)} placeholder="2.00  (+100)" />
                {parseFloat(leg) > 1 && (
                  <div className="text-xs text-zinc-500 pt-1">
                    American: {decToAmerican(parseFloat(leg))} · Win prob: {((1/parseFloat(leg))*100).toFixed(1)}%
                  </div>
                )}
              </Section>
            </div>
            {legs.length > 2 && (
              <button onClick={() => removeLeg(i)} className="mb-0.5 px-2 py-2 text-zinc-500 hover:text-red-400 text-sm">✕</button>
            )}
          </div>
        ))}
        <button
          onClick={addLeg}
          className="w-full py-2 text-xs text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          + Add Leg
        </button>
        <Section label="Stake (£)">
          <NumInput value={stake} onChange={setStake} placeholder="100" min="1" step="1" />
        </Section>
      </div>

      <div className="space-y-4">
        <Card>
          {!allFilled ? (
            <div className="text-zinc-500 text-sm">Fill in all leg odds to calculate</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-1 font-mono">{decToAmerican(totalDec)}</div>
              <div className="text-sm text-zinc-400 mb-4">Combined parlay odds ({totalDec.toFixed(2)} decimal)</div>
              <Row label="Stake" value={`£${s}`} />
              <Row label="Total payout" value={`£${totalPayout}`} color="text-emerald-400" />
              <Row label="Profit" value={`+£${totalProfit}`} color="text-emerald-400" />
              <Row label="Legs" value={`${legs.length}`} />
              <Row label="Implied win probability" value={`${winPct.toFixed(2)}%`} />
              <Row label="Breakeven win rate" value={`1 in ${Math.round(1/winPct*100)}`} />
              <div className="mt-3 pt-3 border-t border-zinc-700">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Leg Breakdown</div>
                {legs.map((l, i) => {
                  const dec = parseFloat(l)
                  return dec > 1 ? (
                    <Row key={i} label={`Leg ${i+1}`} value={`${dec.toFixed(2)} (${decToAmerican(dec)})`} />
                  ) : null
                })}
                <Row label="Combined (×)" value={totalDec.toFixed(4)} />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ODDS CONVERTER
// ═══════════════════════════════════════════════════════════════════════════

function OddsConverter() {
  const [input, setInput]     = useState("")
  const [format, setFormat]   = useState<"decimal" | "american" | "fractional">("american")

  let dec = 0
  if (format === "decimal")    dec = parseFloat(input) || 0
  if (format === "american") {
    const n = parseFloat(input)
    if (!isNaN(n) && n !== 0) dec = americanToDec(n)
  }
  if (format === "fractional") {
    const parts = input.split("/")
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den > 0) dec = num/den + 1
    }
  }

  const valid      = dec > 1
  const american   = valid ? decToAmerican(dec) : "—"
  const fractional = valid ? decToFractional(dec) : "—"
  const decimal    = valid ? dec.toFixed(3) : "—"
  const impliedPct = valid ? ((1/dec)*100).toFixed(2) : "—"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Enter odds in any format. We&apos;ll convert to all three formats and show the implied probability.
        </p>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["american", "decimal", "fractional"] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFormat(f); setInput("") }}
              className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all capitalize ${
                format === f ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Section label={`Enter ${format} odds`}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={format === "american" ? "-110 or +200" : format === "decimal" ? "2.00" : "1/2"}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xl focus:outline-none focus:border-zinc-500"
          />
        </Section>
        <div className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1">
          <p className="text-zinc-400 font-semibold">Quick reference:</p>
          <p>Even money: +100 = 2.00 = 1/1 = 50% implied</p>
          <p>Favourite: -200 = 1.50 = 1/2 = 66.7% implied</p>
          <p>Underdog: +300 = 4.00 = 3/1 = 25% implied</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          {!valid ? (
            <div className="text-zinc-500 text-sm">Enter odds to convert</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-4 font-mono">{american}</div>
              <Row label="American odds" value={american} color="text-white" />
              <Row label="Decimal odds" value={decimal} color="text-blue-300" />
              <Row label="Fractional odds" value={fractional} color="text-purple-300" />
              <Row label="Implied probability" value={`${impliedPct}%`} color="text-yellow-400" />
              <Row label="Breakeven win rate" value={`${impliedPct}%`} />
              <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-500">
                Profit on £100 stake: <span className="text-emerald-400 font-bold">
                  £{(dec > 1 ? (dec-1)*100 : 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// POISSON CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

function PoissonCalc() {
  const [lambda,    setLambda]    = useState("")
  const [threshold, setThreshold] = useState("")
  const [direction, setDirection] = useState<"over" | "under">("over")

  const lam = parseFloat(lambda) || 0
  const thr = parseFloat(threshold) || 0
  const ready = lam > 0 && thr >= 0

  // Over K means X > K, so P(X >= ceil(K+epsilon)) = P(X >= floor(K)+1 for non-integer
  // Under K means X < K, so P(X <= floor(K-epsilon))
  const kInt    = Math.floor(thr)
  const isHalf  = thr !== kInt  // e.g. 3.5

  // P(over K.5) = 1 - P(X <= K)
  // P(over K)   = 1 - P(X <= K)   (strictly over, integer line)
  // P(under K.5)= P(X <= K)
  // P(under K)  = P(X <= K-1)     (strictly under, integer line)
  let prob = 0
  if (ready) {
    if (direction === "over") {
      prob = 1 - poissonCDF(lam, kInt)  // P(X > kInt) = 1 - P(X <= kInt)
    } else {
      prob = isHalf ? poissonCDF(lam, kInt) : poissonCDF(lam, kInt - 1)
    }
  }

  const fairDec     = ready && prob > 0 ? parseFloat((1/prob).toFixed(3)) : 0
  const fairAmerican = fairDec > 1 ? decToAmerican(fairDec) : "—"

  // Distribution table (k=0..10)
  const tableMax = Math.min(12, Math.max(8, kInt + 4))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Uses Poisson distribution to estimate prop bet probability from a player&apos;s average. Works for goals, threes, assists, strikeouts — any count statistic.
        </p>
        <Section label="Player / team average (λ)">
          <NumInput value={lambda} onChange={setLambda} placeholder="2.7  (e.g. avg 3-pointers)" min="0.1" />
        </Section>
        <div className="grid grid-cols-2 gap-2">
          <Section label="Line (threshold)">
            <NumInput value={threshold} onChange={setThreshold} placeholder="3.5" min="0" step="0.5" />
          </Section>
          <Section label="Direction">
            <div className="flex gap-1 mt-1">
              {(["over", "under"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all capitalize ${
                    direction === d ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                  }`}
                >{d}</button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div className="space-y-4">
        <Card highlight={ready && prob > 0 ? undefined : undefined}>
          {!ready ? (
            <div className="text-zinc-500 text-sm">Enter average and line to calculate</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-1">{(prob * 100).toFixed(1)}%</div>
              <div className="text-sm text-zinc-400 mb-4">
                P({direction} {threshold}) based on λ = {lambda}
              </div>
              <Row label="Fair win probability" value={`${(prob * 100).toFixed(2)}%`} color="text-emerald-400" />
              <Row label="Fair decimal odds" value={fairDec > 0 ? fairDec.toFixed(3) : "—"} />
              <Row label="Fair American odds" value={fairAmerican} color="text-blue-300" />
              <Row label="Implied fair price" value={fairDec > 0 ? `${fairDec.toFixed(2)} dec` : "—"} />
              <div className="mt-3 pt-3 border-t border-zinc-700">
                <div className="text-xs text-zinc-500 mb-2">If sportsbook offers {direction} {threshold} at:</div>
                {[200, 250, 280, 300, 350].map(am => {
                  const bookDec = americanToDec(am)
                  const ev = prob * (100 * (bookDec - 1)) - (1 - prob) * 100
                  return (
                    <Row key={am}
                      label={`+${am} odds`}
                      value={`EV: ${ev >= 0 ? "+" : ""}£${ev.toFixed(2)}`}
                      color={ev > 0 ? "text-emerald-400" : "text-red-400"}
                    />
                  )
                })}
              </div>
            </>
          )}
        </Card>

        {/* Probability distribution */}
        {ready && lam > 0 && (
          <Card>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Probability Distribution</div>
            <div className="space-y-1">
              {Array.from({ length: tableMax + 1 }, (_, k) => {
                const p = poissonPMF(lam, k)
                const isHighlighted = direction === "over" ? k > kInt : (isHalf ? k <= kInt : k < kInt)
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className={`w-8 text-right ${isHighlighted ? "text-emerald-400 font-bold" : "text-zinc-400"}`}>
                      {k}:
                    </span>
                    <div className="flex-1 bg-zinc-800 rounded-sm h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${isHighlighted ? "bg-emerald-600" : "bg-zinc-600"}`}
                        style={{ width: `${Math.min(100, p * 300)}%` }}
                      />
                    </div>
                    <span className={`w-12 text-right font-mono ${isHighlighted ? "text-emerald-400" : "text-zinc-500"}`}>
                      {(p * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUND ROBIN CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

function RoundRobinCalc() {
  const [legs, setLegs]   = useState<string[]>(["", "", ""])
  const [parlaySize, setParlaySize] = useState(2)
  const [stakePerParlay, setStakePerParlay] = useState("10")

  const addLeg    = () => setLegs(l => [...l, ""])
  const removeLeg = (i: number) => setLegs(l => l.filter((_, j) => j !== i))
  const setLeg    = (i: number, v: string) => setLegs(l => l.map((x, j) => j === i ? v : x))

  const decOdds  = legs.map(l => parseFloat(l) || 0)
  const allValid = decOdds.every(o => o > 1)
  const n        = legs.length
  const numParlays = allValid ? combinations(n, parlaySize) : 0
  const spp      = parseFloat(stakePerParlay) || 10
  const totalRisk = numParlays * spp

  // Calculate all combinations
  const getCombinations = (arr: number[], r: number): number[][] => {
    if (r === 0) return [[]]
    if (arr.length < r) return []
    const [first, ...rest] = arr
    const withFirst = getCombinations(rest, r - 1).map(c => [first, ...c])
    const withoutFirst = getCombinations(rest, r)
    return [...withFirst, ...withoutFirst]
  }

  const combos = allValid ? getCombinations(decOdds.filter(o => o > 1), parlaySize) : []
  const maxWin = combos.reduce((sum, combo) => {
    const payout = combo.reduce((p, o) => p * o, 1)
    return sum + spp * payout
  }, 0)
  const maxProfit = maxWin - totalRisk

  // Scenario: exactly K legs win
  const scenarioWins = (winsNeeded: number): number => {
    if (!allValid || winsNeeded > n) return 0
    const winOdds  = decOdds.slice(0, winsNeeded).filter(o => o > 1)
    const loseOdds = decOdds.slice(winsNeeded).filter(o => o > 1)
    // Parlays won = C(winsNeeded, parlaySize) if winsNeeded >= parlaySize
    const parlaysWon = winsNeeded >= parlaySize ? combinations(winsNeeded, parlaySize) : 0
    const parlaysLost = numParlays - parlaysWon
    const avgWinPayout = combos
      .filter(c => c.every(o => winOdds.includes(o)))
      .reduce((sum, c) => sum + c.reduce((p, o) => p * o, 1), 0) / Math.max(parlaysWon, 1)
    return parlaysWon * spp * avgWinPayout - parlaysLost * spp
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          A round robin creates all possible parlay combinations from your selected legs. Less risk than a single parlay — you win something even if 1–2 legs lose.
        </p>
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <Section label={`Leg ${i + 1}`}>
                <NumInput value={leg} onChange={v => setLeg(i, v)} placeholder="2.00  (+100)" />
              </Section>
            </div>
            {legs.length > 3 && (
              <button onClick={() => removeLeg(i)} className="mb-0.5 px-2 py-2 text-zinc-500 hover:text-red-400 text-sm">✕</button>
            )}
          </div>
        ))}
        <button onClick={addLeg} className="w-full py-2 text-xs text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
          + Add Leg
        </button>

        <Section label="Parlay size per combination">
          <div className="flex gap-1">
            {[2, 3, 4].filter(s => s < legs.length).map(s => (
              <button key={s} onClick={() => setParlaySize(s)}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  parlaySize === s ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                }`}
              >{s}-leg parlays</button>
            ))}
          </div>
        </Section>

        <Section label="Stake per parlay (£)">
          <NumInput value={stakePerParlay} onChange={setStakePerParlay} placeholder="10" min="1" step="1" />
        </Section>
      </div>

      <div className="space-y-4">
        <Card>
          {!allValid ? (
            <div className="text-zinc-500 text-sm">Fill in all legs to calculate</div>
          ) : (
            <>
              <Row label={`Number of ${parlaySize}-leg parlays`} value={`${numParlays}`} color="text-white" />
              <Row label="Total risk" value={`£${totalRisk.toFixed(2)}`} color="text-yellow-400" />
              <Row label="Max profit (all legs win)" value={`+£${maxProfit.toFixed(2)}`} color="text-emerald-400" />
              <Row label="Max payout" value={`£${maxWin.toFixed(2)}`} />

              <div className="mt-3 pt-3 border-t border-zinc-700">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Parlay Combinations</div>
                {combos.slice(0, 6).map((combo, i) => {
                  const parlayDec = combo.reduce((p, o) => p * o, 1)
                  const payout    = spp * parlayDec
                  return (
                    <Row key={i}
                      label={`Combo ${i+1}: ${combo.map(o => o.toFixed(2)).join(" × ")}`}
                      value={`£${payout.toFixed(2)}`}
                      color="text-zinc-300"
                    />
                  )
                })}
                {combos.length > 6 && <div className="text-xs text-zinc-600 pt-1">+{combos.length - 6} more combinations</div>}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

type CalcTab = "bonus" | "hold" | "parlay" | "odds" | "poisson" | "rr"

const TABS: { id: CalcTab; label: string; desc: string }[] = [
  { id: "bonus",   label: "Bonus Bet",    desc: "Convert bonus bets to cash" },
  { id: "hold",    label: "Hold / Vig",   desc: "Market juice calculator" },
  { id: "parlay",  label: "Parlay",       desc: "Multi-leg payout builder" },
  { id: "odds",    label: "Odds Convert", desc: "American ↔ Decimal ↔ Fractional" },
  { id: "poisson", label: "Poisson",      desc: "Prop bet probability" },
  { id: "rr",      label: "Round Robin",  desc: "All parlay combinations" },
]

export default function CalculatorsPage() {
  const [tab, setTab] = useState<CalcTab>("bonus")

  return (
    <div className={`min-h-screen bg-black text-white ${GeistMono.className}`}>
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-zinc-500 text-sm hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold mt-1">Betting Calculators</h1>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/arb" className="hover:text-white">Arb / EV</Link>
          <Link href="/edge" className="hover:text-white">Line Shop</Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">

        {/* Tab grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`p-3 rounded-xl text-left transition-all border ${
                tab === t.id
                  ? "border-zinc-500 bg-zinc-800 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="font-semibold text-xs">{t.label}</div>
              <div className="text-xs text-zinc-600 mt-0.5 leading-tight">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Active calculator */}
        <div>
          {tab === "bonus"   && <BonusBetCalc />}
          {tab === "hold"    && <HoldCalc />}
          {tab === "parlay"  && <ParlayCalc />}
          {tab === "odds"    && <OddsConverter />}
          {tab === "poisson" && <PoissonCalc />}
          {tab === "rr"      && <RoundRobinCalc />}
        </div>

        <div className="text-xs text-zinc-700 border-t border-zinc-800 pt-4">
          All calculators run client-side — no data is sent to any server. Results are mathematical estimates only.
        </div>
      </div>
    </div>
  )
}
