'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface PerformanceStats {
  winRate: number
  roi: number
  avgCLV: number
  total: number
  profit: number
  cumulativeData: Array<{ x: number; y: number; date: string }>
}

export default function PerformancePage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/performance')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch performance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Loading performance data...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 border-b bg-white z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-gray-500">Last {stats.total} bets</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            subtitle={`${Math.round(stats.winRate / 100 * stats.total)} wins`}
          />
          <StatCard
            title="ROI"
            value={`${stats.roi.toFixed(1)}%`}
            subtitle={`£${stats.profit.toFixed(0)} profit`}
            positive={stats.roi > 0}
          />
          <StatCard
            title="Avg CLV"
            value={stats.avgCLV.toFixed(2)}
            subtitle="Closing line value"
            positive={stats.avgCLV > 0}
          />
          <StatCard
            title="Total Bets"
            value={stats.total}
            subtitle="Tracked"
          />
        </div>

        {/* ROI Chart */}
        <div className="p-6 border rounded-xl mb-8">
          <h2 className="font-semibold mb-4">Profit Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.cumulativeData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `£${(value as number).toFixed(0)}`}
                labelFormatter={(label) => `Bet ${label}`}
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#000"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CLV Explanation */}
        <div className="p-6 bg-gray-50 rounded-xl">
          <h3 className="font-semibold mb-2">📊 Closing Line Value (CLV)</h3>
          <p className="text-sm text-gray-600 mb-3">
            CLV measures whether you consistently beat the market. If you get better odds than
            the closing line, you have a long-term edge — regardless of immediate results.
          </p>
          <p className="text-sm text-gray-600">
            <strong>Your CLV:</strong> {stats.avgCLV > 0 ? '✓ Positive' : '✗ Negative'} → You are{' '}
            {stats.avgCLV > 0 ? 'beating' : 'losing to'} the market
          </p>
        </div>

        {/* Learn more link */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Want to understand your edge better?</p>
          <a href="/upgrade" className="text-black font-medium hover:underline">
            Unlock Pro dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  positive?: boolean
}

function StatCard({ title, value, subtitle, positive }: StatCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-xs uppercase text-gray-500 font-medium">{title}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : ''
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
