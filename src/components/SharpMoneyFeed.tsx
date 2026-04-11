'use client'

import { useEffect, useState } from 'react'

type SharpSignal = {
  marketId: string
  selectionId: number
  selectionName: string
  home: string
  away: string
  signalType: 'VOLUME_SPIKE' | 'ODDS_STEAM' | 'REVERSE_LINE' | 'COMBINED'
  currentOdds: number
  previousOdds: number | null
  oddsMovePct: number
  matchedVolume: number
  volumeBaselineRatio: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  detectedAt: string
  recommendation: string
}

const SIGNAL_LABELS: Record<SharpSignal['signalType'], string> = {
  COMBINED:      '⚡ COMBINED',
  VOLUME_SPIKE:  '📊 VOLUME',
  ODDS_STEAM:    '🔥 STEAM',
  REVERSE_LINE:  '↩️ REVERSE',
}

const CONF_COLORS: Record<SharpSignal['confidence'], string> = {
  HIGH:   'border-red-500/60 bg-red-950/20',
  MEDIUM: 'border-yellow-500/60 bg-yellow-950/20',
  LOW:    'border-zinc-600 bg-zinc-900/30',
}

const CONF_BADGE: Record<SharpSignal['confidence'], string> = {
  HIGH:   'bg-red-600 text-white',
  MEDIUM: 'bg-yellow-600 text-white',
  LOW:    'bg-zinc-600 text-white',
}

export default function SharpMoneyFeed() {
  const [signals, setSignals] = useState<SharpSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchSignals() {
    try {
      const res = await fetch('/api/sharp-signals')
      if (res.ok) {
        const data = await res.json()
        setSignals(Array.isArray(data) ? data : [])
        setLastUpdated(new Date())
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 60_000) // refresh every 60s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm border border-zinc-800 rounded-lg">
        <p>No sharp activity detected</p>
        <p className="text-xs mt-1 text-zinc-600">
          {process.env.NEXT_PUBLIC_BETFAIR_ENABLED
            ? 'Monitoring Betfair markets...'
            : 'Add BETFAIR_APP_KEY + BETFAIR_SESSION_TOKEN to go live'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">
          {signals.length} alert{signals.length !== 1 ? 's' : ''}
        </span>
        {lastUpdated && (
          <span className="text-xs text-zinc-600">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {signals.map((s, i) => (
        <div
          key={`${s.marketId}-${s.selectionId}-${i}`}
          className={`rounded-lg border p-3 ${CONF_COLORS[s.confidence]}`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-bold text-sm text-white">
                {s.home} vs {s.away}
              </div>
              <div className="text-xs text-blue-300 font-semibold mt-0.5">
                {s.selectionName}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${CONF_BADGE[s.confidence]}`}>
                {s.confidence}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {SIGNAL_LABELS[s.signalType]}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
            <div className="bg-zinc-800/60 rounded p-1.5 text-center">
              <div className="text-zinc-400">Odds</div>
              <div className="font-mono text-white font-bold">{s.currentOdds.toFixed(2)}</div>
              {s.previousOdds && (
                <div className="text-red-400 text-xs">
                  ↓ {s.oddsMovePct}%
                </div>
              )}
            </div>
            <div className="bg-zinc-800/60 rounded p-1.5 text-center">
              <div className="text-zinc-400">Volume</div>
              <div className="font-mono text-white font-bold">
                £{s.matchedVolume >= 1000
                  ? `${(s.matchedVolume / 1000).toFixed(0)}k`
                  : s.matchedVolume.toFixed(0)}
              </div>
            </div>
            <div className="bg-zinc-800/60 rounded p-1.5 text-center">
              <div className="text-zinc-400">vs Normal</div>
              <div className={`font-mono font-bold ${s.volumeBaselineRatio >= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                {s.volumeBaselineRatio > 0 ? `${s.volumeBaselineRatio}x` : '—'}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <p className="text-xs text-zinc-300 leading-relaxed">
            {s.recommendation}
          </p>
        </div>
      ))}
    </div>
  )
}
