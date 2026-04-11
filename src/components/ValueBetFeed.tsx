"use client"

import { useEffect, useState, useCallback } from "react"

type ValueBet = {
  fixtureId: string
  homeTeam: string
  awayTeam: string
  kickoff: string
  league: string
  outcome: string
  outcomeName: string
  softBook: string
  softBookLabel: string
  softOdds: number
  sharpBook: string
  sharpOdds: number
  fairProb: number
  impliedProb: number
  edge: number
  ev: number
  yield: number
  confidence: "HIGH" | "MEDIUM" | "LOW"
}

type FeedData = {
  valueBets: ValueBet[]
  count: number
  highConfidence: number
  avgYield: number
  scannedFixtures: number
  tip: string
}

const CONFIDENCE_STYLE = {
  HIGH:   "bg-emerald-900/60 border-emerald-600/50 text-emerald-300",
  MEDIUM: "bg-yellow-900/40 border-yellow-600/40 text-yellow-300",
  LOW:    "bg-zinc-800 border-zinc-700 text-zinc-300",
}

const CONFIDENCE_BADGE = {
  HIGH:   "bg-emerald-600 text-white",
  MEDIUM: "bg-yellow-600 text-white",
  LOW:    "bg-zinc-600 text-zinc-300",
}

export default function ValueBetFeed() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [minEdge, setMinEdge] = useState(2)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/value-bets?minEdge=${minEdge / 100}`)
      .then(r => r.json())
      .then(d => { setData(d); setLastRefresh(new Date()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [minEdge])

  useEffect(() => {
    load()
    const t = setInterval(load, 2 * 60 * 1000)  // refresh every 2 min
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">Min edge:</span>
          <div className="flex gap-1">
            {[2, 3, 4, 5].map(e => (
              <button
                key={e}
                onClick={() => setMinEdge(e)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  minEdge === e ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                }`}
              >
                {e}%
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-zinc-600">
              Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Scanning…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {data && !loading && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Value bets", value: data.count.toString(), color: data.count > 0 ? "text-emerald-400" : "text-zinc-400" },
            { label: "High confidence", value: data.highConfidence.toString(), color: "text-emerald-400" },
            { label: "Avg yield", value: data.avgYield > 0 ? `+${data.avgYield}%` : "—", color: "text-yellow-400" },
            { label: "Fixtures scanned", value: data.scannedFixtures.toString(), color: "text-zinc-400" },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
              <div className={`font-bold font-mono text-lg ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bet list */}
      {loading && !data ? (
        <div className="text-zinc-500 text-sm animate-pulse py-8 text-center">
          Scanning bookmakers for value…
        </div>
      ) : !data?.valueBets?.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="text-zinc-500 text-sm">
            {data?.tip || "No value bets found at this edge threshold. Try lowering the minimum edge."}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.valueBets.map((bet, i) => (
            <div
              key={`${bet.fixtureId}-${bet.outcome}-${bet.softBook}`}
              className={`rounded-xl border p-4 transition-all ${CONFIDENCE_STYLE[bet.confidence]}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${CONFIDENCE_BADGE[bet.confidence]}`}>
                      {bet.confidence}
                    </span>
                    <span className="text-xs text-zinc-400">{bet.league}</span>
                    <span className="text-xs text-zinc-600">
                      {new Date(bet.kickoff).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="font-semibold text-sm text-white mb-0.5">
                    {bet.homeTeam} vs {bet.awayTeam}
                  </div>
                  <div className="text-xs text-zinc-400">
                    <span className="font-semibold text-white">{bet.outcomeName}</span>
                    {" "}@ <span className="font-mono font-bold text-emerald-300">{bet.softOdds.toFixed(2)}</span>
                    {" "}on <span className="font-semibold">{bet.softBookLabel}</span>
                  </div>
                </div>

                {/* Key numbers */}
                <div className="text-right ml-4 space-y-0.5">
                  <div className="font-mono font-bold text-emerald-300 text-xl">
                    +{bet.edge}%
                  </div>
                  <div className="text-xs text-zinc-400">edge</div>
                  <div className={`text-sm font-bold font-mono ${bet.ev > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {bet.ev >= 0 ? "+" : ""}£{bet.ev}
                  </div>
                  <div className="text-xs text-zinc-500">EV/£100</div>
                </div>
              </div>

              {/* Odds comparison */}
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-zinc-500 mb-0.5">Your price</div>
                  <div className="font-mono font-bold text-emerald-300">{bet.softOdds.toFixed(2)}</div>
                  <div className="text-zinc-600">{bet.softBookLabel}</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-0.5">Pinnacle ref</div>
                  <div className="font-mono font-bold text-zinc-300">{bet.sharpOdds.toFixed(2)}</div>
                  <div className="text-zinc-600">True market</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-0.5">Fair probability</div>
                  <div className="font-mono font-bold text-blue-300">{(bet.fairProb * 100).toFixed(1)}%</div>
                  <div className="text-zinc-600">No-vig</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.tip && data.valueBets.length > 0 && (
        <div className="text-xs text-zinc-500 text-center">{data.tip}</div>
      )}
    </div>
  )
}
