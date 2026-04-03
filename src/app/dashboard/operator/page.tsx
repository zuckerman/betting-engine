"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts"

interface DashboardData {
  bankroll: number
  pnl: number
  avgCLV: number
  active: number
  status: string
  total: number
  beatMarket: number
  winRate: number
  drawdown: number
  liveBets: Array<{
    id: string
    match: string
    odds: number
    edge: number
    stake: number
    tier: string
    status: string
  }>
  clvHistory: Array<{
    time: string
    value: number
    cumulative: number
  }>
  exposureBreakdown: {
    daily: number
    match: number
    league: number
  }
  tierBreakdown: {
    "A+": number
    A: number
    B: number
    C: number
  }
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 shadow-sm">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${color || "text-white"}`}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RUNNING: "bg-green-900 text-green-300",
    PAUSED: "bg-yellow-900 text-yellow-300",
    ERROR: "bg-red-900 text-red-300",
    IDLE: "bg-zinc-800 text-zinc-300",
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        colors[status] || "bg-zinc-800 text-zinc-300"
      }`}
    >
      {status}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    "A+": "bg-green-900 text-green-300",
    A: "bg-blue-900 text-blue-300",
    B: "bg-yellow-900 text-yellow-300",
    C: "bg-zinc-800 text-zinc-300",
  }

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        colors[tier] || "bg-zinc-800 text-zinc-300"
      }`}
    >
      {tier}
    </span>
  )
}

export default function OperatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/predictions/stats")
        if (!res.ok) throw new Error("Failed to fetch dashboard data")
        const json = await res.json()

        // Transform API response to dashboard format
        setData({
          bankroll: 1000, // Replace with actual from DB
          pnl: json.netPnL || 0,
          avgCLV: json.avgCLV || 0,
          active: json.activeBets || 0,
          status: "RUNNING",
          total: json.totalBets || 0,
          beatMarket: json.beatMarketPercentage || 0,
          winRate: json.winRate || 0,
          drawdown: 0.12, // Replace with actual
          liveBets: [
            // Placeholder - will be populated from API
          ],
          clvHistory: json.clvHistory || [],
          exposureBreakdown: {
            daily: 0.12,
            match: 0.08,
            league: 0.05,
          },
          tierBreakdown: {
            "A+": 12,
            A: 34,
            B: 56,
            C: 112,
          },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 flex items-center justify-center">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="text-zinc-400">No data available</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              autoRefresh
                ? "bg-green-900 text-green-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {autoRefresh ? "🔄 Auto-Refresh ON" : "🔄 Auto-Refresh OFF"}
          </button>
          <StatusBadge status={data.status} />
        </div>
      </div>

      {/* PRIMARY METRICS - Top Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatBox label="Bankroll" value={`£${data.bankroll.toLocaleString()}`} />
        <StatBox
          label="PnL Today"
          value={`£${data.pnl > 0 ? "+" : ""}${data.pnL.toFixed(2)}`}
          color={data.pnl > 0 ? "text-green-400" : "text-red-400"}
        />
        <StatBox
          label="Avg CLV"
          value={`${(data.avgCLV * 100).toFixed(2)}%`}
          color={data.avgCLV > 0 ? "text-green-400" : "text-red-400"}
        />
        <StatBox label="Active Bets" value={data.active} />
        <StatBox
          label="Drawdown"
          value={`${(data.drawdown * 100).toFixed(1)}%`}
          color={data.drawdown < 0.15 ? "text-green-400" : "text-yellow-400"}
        />
      </div>

      {/* SECONDARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Bets" value={data.total} />
        <StatBox
          label="Beat Market"
          value={`${data.beatMarket.toFixed(1)}%`}
          color={data.beatMarket > 52 ? "text-green-400" : "text-zinc-400"}
        />
        <StatBox label="Win Rate" value={`${data.winRate.toFixed(1)}%`} />
        <StatBox label="Sample Size" value={data.total} />
      </div>

      {/* EXPOSURE & TIER BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exposure */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-lg font-bold mb-4">Daily Exposure</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Daily</span>
                <span className="text-white">
                  {(data.exposureBreakdown.daily * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${data.exposureBreakdown.daily * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Per Match</span>
                <span className="text-white">
                  {(data.exposureBreakdown.match * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${data.exposureBreakdown.match * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Per League</span>
                <span className="text-white">
                  {(data.exposureBreakdown.league * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-yellow-500 h-full"
                  style={{ width: `${data.exposureBreakdown.league * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-lg font-bold mb-4">Bet Tier Distribution</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-900/30 p-3 rounded border border-green-800">
              <div className="text-xs text-green-400 mb-1">A+</div>
              <div className="text-2xl font-bold text-green-300">
                {data.tierBreakdown["A+"]}
              </div>
            </div>
            <div className="bg-blue-900/30 p-3 rounded border border-blue-800">
              <div className="text-xs text-blue-400 mb-1">A</div>
              <div className="text-2xl font-bold text-blue-300">
                {data.tierBreakdown.A}
              </div>
            </div>
            <div className="bg-yellow-900/30 p-3 rounded border border-yellow-800">
              <div className="text-xs text-yellow-400 mb-1">B</div>
              <div className="text-2xl font-bold text-yellow-300">
                {data.tierBreakdown.B}
              </div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700">
              <div className="text-xs text-zinc-400 mb-1">C</div>
              <div className="text-2xl font-bold text-zinc-300">
                {data.tierBreakdown.C}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLV CURVE */}
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-lg font-bold mb-4">CLV Performance Curve</h2>
        {data.clvHistory && data.clvHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.clvHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                formatter={(value: any) => `${(value * 100).toFixed(2)}%`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                name="Daily CLV"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#3b82f6"
                name="Cumulative"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-zinc-500 text-center py-12">No data yet</div>
        )}
      </div>

      {/* LIVE BETS TABLE */}
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-lg font-bold mb-4">Live Bets ({data.liveBets.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-zinc-400 font-medium">Match</th>
                <th className="text-right py-2 text-zinc-400 font-medium">Odds</th>
                <th className="text-right py-2 text-zinc-400 font-medium">Edge</th>
                <th className="text-right py-2 text-zinc-400 font-medium">Stake</th>
                <th className="text-center py-2 text-zinc-400 font-medium">Tier</th>
                <th className="text-center py-2 text-zinc-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.liveBets.length > 0 ? (
                data.liveBets.map((bet) => (
                  <tr key={bet.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3">{bet.match}</td>
                    <td className="text-right">{bet.odds.toFixed(2)}</td>
                    <td
                      className={`text-right font-medium ${
                        bet.edge > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {(bet.edge * 100).toFixed(2)}%
                    </td>
                    <td className="text-right">£{bet.stake.toFixed(2)}</td>
                    <td className="text-center">
                      <TierBadge tier={bet.tier} />
                    </td>
                    <td className="text-center">
                      <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded">
                        {bet.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No active bets
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER - STATUS */}
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 text-xs text-zinc-400">
        <div className="flex justify-between">
          <div>Last updated: {new Date().toLocaleTimeString()}</div>
          <div>System Uptime: 14 days 22 hours</div>
        </div>
      </div>
    </div>
  )
}
