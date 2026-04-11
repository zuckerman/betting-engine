"use client"

import { useEffect, useState } from "react"

type BookOdds = {
  bookmaker: string
  bookmakerLabel: string
  isSharp: boolean
  home: number
  draw: number
  away: number
  margin: number
}

type Fixture = {
  fixtureId: string
  homeTeam: string
  awayTeam: string
  kickoff: string
  league: string
  bestHome: { odds: number; bookmaker: string }
  bestDraw: { odds: number; bookmaker: string }
  bestAway: { odds: number; bookmaker: string }
  sharpHome: number | null
  sharpDraw: number | null
  sharpAway: number | null
  lineDiffHome: number | null
  lineDiffDraw: number | null
  lineDiffAway: number | null
  books: BookOdds[]
  arbMargin: number
  isArb: boolean
  arbStakes?: {
    homeStake: number
    drawStake: number
    awayStake: number
    guaranteedProfit: number
    profitPct: number
  }
}

type LineShopData = {
  fixtures: Fixture[]
  arbOpportunities: number
  tip: string
}

function diffColor(diff: number | null) {
  if (diff === null) return "text-zinc-500"
  if (diff >= 3) return "text-emerald-400 font-bold"
  if (diff >= 1) return "text-yellow-400"
  return "text-zinc-400"
}

function OddsCell({ odds, diff, bookmaker }: { odds: number; diff: number | null; bookmaker: string }) {
  return (
    <div className="text-right">
      <div className="font-mono font-bold text-white">{odds.toFixed(2)}</div>
      <div className="text-xs text-zinc-500">{bookmaker.slice(0, 7)}</div>
      {diff !== null && (
        <div className={`text-xs ${diffColor(diff)}`}>
          {diff > 0 ? "+" : ""}{diff}%
        </div>
      )}
    </div>
  )
}

export default function LineShopPanel() {
  const [data, setData] = useState<LineShopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const load = () => {
      fetch("/api/line-shop")
        .then(r => r.json())
        .then(setData)
        .finally(() => setLoading(false))
    }
    load()
    const t = setInterval(load, 3 * 60 * 1000) // refresh every 3 min
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm animate-pulse">Scanning bookmakers...</div>
    )
  }

  if (!data?.fixtures?.length) {
    return (
      <div className="text-zinc-500 text-sm">
        No fixtures found. Check ODDS_API_KEY is configured.
      </div>
    )
  }

  const fixtures = showAll ? data.fixtures : data.fixtures.slice(0, 8)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          {data.arbOpportunities > 0 && (
            <div className="text-xs bg-emerald-900/60 border border-emerald-600/50 text-emerald-300 px-2 py-1 rounded font-bold animate-pulse">
              {data.arbOpportunities} ARB FOUND — GUARANTEED PROFIT
            </div>
          )}
        </div>
        <div className="text-xs text-zinc-500">{data.fixtures.length} fixtures</div>
      </div>

      {/* Fixture list */}
      {fixtures.map(f => (
        <div
          key={f.fixtureId}
          className={`rounded-lg border transition-all cursor-pointer ${
            f.isArb
              ? "border-emerald-600/60 bg-emerald-900/20"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
          onClick={() => setExpanded(expanded === f.fixtureId ? null : f.fixtureId)}
        >
          {/* Fixture header */}
          <div className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-zinc-500 mb-0.5">{f.league}</div>
                <div className="text-sm font-semibold text-white">
                  {f.homeTeam} vs {f.awayTeam}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  {new Date(f.kickoff).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {f.isArb && f.arbStakes && (
                <div className="text-right">
                  <div className="text-xs text-emerald-400 font-bold">ARB</div>
                  <div className="text-sm font-bold text-emerald-300">
                    +{f.arbStakes.profitPct}%
                  </div>
                  <div className="text-xs text-zinc-500">guaranteed</div>
                </div>
              )}
            </div>

            {/* Best odds row */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <div className="text-xs text-zinc-500 mb-1">HOME</div>
                <OddsCell odds={f.bestHome.odds} diff={f.lineDiffHome} bookmaker={f.bestHome.bookmaker} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">DRAW</div>
                <OddsCell odds={f.bestDraw.odds} diff={f.lineDiffDraw} bookmaker={f.bestDraw.bookmaker} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">AWAY</div>
                <OddsCell odds={f.bestAway.odds} diff={f.lineDiffAway} bookmaker={f.bestAway.bookmaker} />
              </div>
            </div>
          </div>

          {/* Expanded: all bookmakers + arb breakdown */}
          {expanded === f.fixtureId && (
            <div className="border-t border-zinc-800 p-3 space-y-2">
              {/* Arb staking guide */}
              {f.isArb && f.arbStakes && (
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded p-2 mb-3">
                  <div className="text-xs font-bold text-emerald-400 mb-1">ARB CALCULATOR — £100 TOTAL STAKE</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-zinc-400">HOME:</span> <span className="text-white font-mono">£{f.arbStakes.homeStake}</span> @ {f.bestHome.odds.toFixed(2)} ({f.bestHome.bookmaker})</div>
                    <div><span className="text-zinc-400">DRAW:</span> <span className="text-white font-mono">£{f.arbStakes.drawStake}</span> @ {f.bestDraw.odds.toFixed(2)} ({f.bestDraw.bookmaker})</div>
                    <div><span className="text-zinc-400">AWAY:</span> <span className="text-white font-mono">£{f.arbStakes.awayStake}</span> @ {f.bestAway.odds.toFixed(2)} ({f.bestAway.bookmaker})</div>
                  </div>
                  <div className="mt-2 text-xs text-emerald-300 font-bold">
                    Guaranteed profit: £{f.arbStakes.guaranteedProfit} (+{f.arbStakes.profitPct}%) regardless of result
                  </div>
                </div>
              )}

              {/* All books table */}
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">All Bookmakers</div>
              <div className="space-y-1">
                {f.books.map(b => (
                  <div key={b.bookmaker} className={`grid grid-cols-5 gap-1 text-xs py-1 ${b.isSharp ? "text-blue-300" : "text-zinc-300"}`}>
                    <div className="col-span-2 flex items-center gap-1">
                      {b.isSharp && <span className="text-blue-500">◆</span>}
                      {b.bookmakerLabel}
                    </div>
                    <div className="text-right font-mono">{b.home.toFixed(2)}</div>
                    <div className="text-right font-mono">{b.draw.toFixed(2)}</div>
                    <div className="text-right font-mono">{b.away.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-zinc-600 mt-1">◆ = sharp book (Pinnacle / Betfair)</div>
            </div>
          )}
        </div>
      ))}

      {/* Show more */}
      {data.fixtures.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg transition-colors"
        >
          {showAll ? "Show less" : `Show all ${data.fixtures.length} fixtures`}
        </button>
      )}

      <div className="text-xs text-zinc-600 text-center">{data.tip}</div>
    </div>
  )
}
