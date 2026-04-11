'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GeistMono } from 'geist/font/mono'

type Summary = {
  totalBets: number
  wins: number
  losses: number
  winRate: number
  totalStaked: number
  totalPnl: number
  roi: number
  currentBankroll: number
  startingBankroll: number
  bankrollGrowth: number
  maxDrawdown: number
  maxDrawdownPct: number
  sharpe: number
  clvCaptureRate: number
  avgClv: number
  streak: { count: number; type: 'W' | 'L' | null }
}

type EquityPoint = { date: string; bankroll: number; drawdown: number }
type MonthRow   = { month: string; pnl: number; roi: number; bets: number; winRate: number }
type BetRow     = { fixture: string; market: string; odds: number; stake: number; pnl: number; date: string }

type TrackerData = {
  summary: Summary
  equity: EquityPoint[]
  monthly: MonthRow[]
  bestBets: BetRow[]
  worstBets: BetRow[]
  empty?: boolean
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  )
}

function pnlColor(v: number) {
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-zinc-400'
}

export default function TrackerPage() {
  const [data, setData] = useState<TrackerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/performance/tracker')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  if (!data || data.empty) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-semibold text-white mb-2">No settled bets yet</p>
          <p className="text-sm">P&amp;L tracking starts once bets settle.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const s = data.summary

  return (
    <div className={`min-h-screen bg-black text-white ${GeistMono.className}`}>
      {/* Top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-zinc-500 text-sm hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold mt-1">Performance Tracker</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Current Bankroll</div>
          <div className={`text-3xl font-bold ${pnlColor(s.currentBankroll - s.startingBankroll)}`}>
            £{s.currentBankroll.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total P&L" value={`${s.totalPnl >= 0 ? '+' : ''}£${s.totalPnl.toFixed(2)}`} color={pnlColor(s.totalPnl)} sub={`${s.bankrollGrowth >= 0 ? '+' : ''}${s.bankrollGrowth}% growth`} />
          <StatCard label="ROI" value={`${s.roi >= 0 ? '+' : ''}${s.roi}%`} color={pnlColor(s.roi)} sub={`${s.totalBets} bets`} />
          <StatCard label="Win Rate" value={`${s.winRate}%`} sub={`${s.wins}W / ${s.losses}L`} />
          <StatCard label="Sharpe" value={s.sharpe.toFixed(2)} color={s.sharpe > 1 ? 'text-emerald-400' : s.sharpe > 0 ? 'text-yellow-400' : 'text-red-400'} sub="Annualised" />
          <StatCard label="Max Drawdown" value={`-${s.maxDrawdownPct}%`} color="text-red-400" sub={`-£${s.maxDrawdown.toFixed(2)}`} />
          <StatCard label="CLV Capture" value={`${s.clvCaptureRate}%`} color={s.clvCaptureRate > 55 ? 'text-emerald-400' : 'text-yellow-400'} sub={`Avg ${s.avgClv > 0 ? '+' : ''}${s.avgClv}%`} />
          <StatCard label="Total Staked" value={`£${s.totalStaked.toFixed(0)}`} />
          <StatCard
            label="Streak"
            value={`${s.streak.count}${s.streak.type || ''}`}
            color={s.streak.type === 'W' ? 'text-emerald-400' : 'text-red-400'}
            sub={s.streak.type === 'W' ? 'Winning run' : 'Losing run'}
          />
        </div>

        {/* Equity curve (text-based sparkline) */}
        {data.equity.length > 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Equity Curve</h2>
            <div className="flex items-end gap-px h-24 w-full">
              {data.equity.map((pt, i) => {
                const min = Math.min(...data.equity.map(p => p.bankroll))
                const max = Math.max(...data.equity.map(p => p.bankroll))
                const range = max - min || 1
                const height = Math.max(4, ((pt.bankroll - min) / range) * 100)
                const isUp = pt.bankroll >= s.startingBankroll
                return (
                  <div
                    key={i}
                    title={`£${pt.bankroll} — ${pt.date?.slice(0, 10)}`}
                    style={{ height: `${height}%`, flex: 1 }}
                    className={`rounded-sm ${isUp ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>{data.equity[0]?.date?.slice(0, 10)}</span>
              <span>{data.equity[data.equity.length - 1]?.date?.slice(0, 10)}</span>
            </div>
          </div>
        )}

        {/* Monthly table */}
        {data.monthly.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Monthly Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left pb-2">Month</th>
                  <th className="text-right pb-2">P&L</th>
                  <th className="text-right pb-2">ROI</th>
                  <th className="text-right pb-2">Bets</th>
                  <th className="text-right pb-2">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map(m => (
                  <tr key={m.month} className="border-b border-zinc-800/50">
                    <td className="py-2 text-zinc-300">{m.month}</td>
                    <td className={`py-2 text-right font-mono font-bold ${pnlColor(m.pnl)}`}>
                      {m.pnl >= 0 ? '+' : ''}£{m.pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 text-right font-mono ${pnlColor(m.roi)}`}>
                      {m.roi >= 0 ? '+' : ''}{m.roi}%
                    </td>
                    <td className="py-2 text-right text-zinc-400">{m.bets}</td>
                    <td className="py-2 text-right text-zinc-400">{m.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Best / Worst */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ title: '🏆 Best Bets', bets: data.bestBets }, { title: '💀 Worst Bets', bets: data.worstBets }].map(({ title, bets }) => (
            <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">{title}</h2>
              <div className="space-y-2">
                {bets.map((b, i) => (
                  <div key={i} className="flex justify-between items-start text-sm border-b border-zinc-800/50 pb-2">
                    <div>
                      <div className="text-white text-xs font-semibold">{b.fixture}</div>
                      <div className="text-zinc-500 text-xs">{b.market} @ {b.odds.toFixed(2)} — £{b.stake}</div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${pnlColor(b.pnl)}`}>
                      {b.pnl >= 0 ? '+' : ''}£{b.pnl.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
