'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ValidationData {
  total: number
  avgCLV: number
  positiveCLVPercent: number
  roi: number
  leagueStats: Array<{ league: string; count: number; avgCLV: number; hitRate: number; roi: number }>
  marketStats: Array<{ market: string; count: number; avgCLV: number; hitRate: number; roi: number }>
  redFlags: {
    negativeCLV: boolean
    lowHitRate: boolean
    smallSample: boolean
    negativeROI: boolean
  }
}

export default function ValidationPage() {
  const router = useRouter()
  const [data, setData] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/validation')
        if (res.status === 403) {
          setUnauthorized(true)
          return
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch validation data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="text-gray-600 mb-6">This dashboard is private. Contact admin.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading validation data...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 border-b bg-white z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">🧪 Validation Dashboard</h1>
          <p className="text-sm text-gray-500">Private • Admin Only</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 🚨 Red Flags (TOP) */}
        {(data.redFlags.negativeCLV ||
          data.redFlags.lowHitRate ||
          data.redFlags.smallSample ||
          data.redFlags.negativeROI) && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
            <h2 className="font-semibold text-red-900 mb-4">⚠️ Red Flags</h2>
            <ul className="space-y-2 text-sm text-red-700">
              {data.redFlags.negativeCLV && (
                <li>❌ Negative CLV — model is losing to the market</li>
              )}
              {data.redFlags.lowHitRate && (
                <li>❌ Hit rate below 50% — not beating closing line consistently</li>
              )}
              {data.redFlags.smallSample && (
                <li>⚠️ Sample size too small (&lt;100) — results unreliable</li>
              )}
              {data.redFlags.negativeROI && (
                <li>❌ Negative ROI — losing money (check vs CLV)</li>
              )}
            </ul>
          </div>
        )}

        {/* Core metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Avg CLV"
            value={data.avgCLV.toFixed(3)}
            subtitle="Closing line value"
            positive={data.avgCLV > 0}
          />
          <MetricCard
            label="% Beating Market"
            value={`${data.positiveCLVPercent.toFixed(1)}%`}
            subtitle="Consistent edge"
            positive={data.positiveCLVPercent > 55}
          />
          <MetricCard
            label="ROI"
            value={`${data.roi.toFixed(1)}%`}
            subtitle="Return on investment"
            positive={data.roi > 0}
          />
          <MetricCard
            label="Total Bets"
            value={data.total}
            subtitle="Sample size"
          />
        </div>

        {/* League Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">📊 Performance by League</h2>
          <div className="space-y-3">
            {data.leagueStats.map((league) => (
              <div key={league.league} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{league.league}</p>
                  <span className="text-xs text-gray-500">n={league.count}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">CLV</p>
                    <p className={`font-semibold ${league.avgCLV > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {league.avgCLV.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hit Rate</p>
                    <p className="font-semibold">{league.hitRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">ROI</p>
                    <p className={`font-semibold ${league.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {league.roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Breakdown */}
        <div>
          <h2 className="text-lg font-semibold mb-4">📈 Performance by Market</h2>
          <div className="space-y-3">
            {data.marketStats.map((market) => (
              <div key={market.market} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{market.market}</p>
                  <span className="text-xs text-gray-500">n={market.count}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">CLV</p>
                    <p className={`font-semibold ${market.avgCLV > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {market.avgCLV.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hit Rate</p>
                    <p className="font-semibold">{market.hitRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">ROI</p>
                    <p className={`font-semibold ${market.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {market.roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  positive?: boolean
}

function MetricCard({ label, value, subtitle, positive }: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-xs uppercase text-gray-500 font-medium">{label}</p>
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
