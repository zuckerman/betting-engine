"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Analytics() {
  const { data, error, isLoading } = useSWR("/api/analytics/report", fetcher, {
    refreshInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Error loading analytics</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📊 System Analytics</h1>
          <Link href="/" className="text-sm text-blue-500 hover:underline">
            ← Back
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>

      <div className="space-y-6 p-6">
        {/* Portfolio Summary */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">💰 Portfolio Summary</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-gray-600">Total Bets</div>
              <div className="text-2xl font-bold">
                {data.portfolio.total_bets}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Profit</div>
              <div className="text-2xl font-bold text-green-600">
                ${data.portfolio.total_profit.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">ROI</div>
              <div className="text-2xl font-bold">{data.portfolio.roi}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Win Rate</div>
              <div className="text-2xl font-bold">
                {data.portfolio.win_rate}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg Edge</div>
              <div className="text-2xl font-bold">{data.portfolio.avg_edge}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Stake</div>
              <div className="text-2xl font-bold">
                ${data.portfolio.total_stake.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Calibration */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">🧠 Model Calibration</h2>
            <span
              className={`rounded px-2 py-1 text-sm font-semibold ${
                data.calibration.health === "✓ Healthy"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {data.calibration.health}
            </span>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            {data.calibration.summary}
          </p>

          {data.calibration.warnings.length > 0 && (
            <div className="mb-4 rounded bg-yellow-50 p-3">
              <div className="text-sm font-semibold text-yellow-800">
                Warnings:
              </div>
              <ul className="mt-1 list-inside space-y-1 text-sm text-yellow-700">
                {data.calibration.warnings.map((w: string, i: number) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {data.calibration.breakdown.map((c: any, i: number) => (
              <div key={i} className="rounded border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {c.probability_range}
                    </div>
                    <div className="text-sm text-gray-600">
                      {c.bets} bets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Expected: {c.expected}</div>
                    <div className="text-sm">Actual: {c.actual}</div>
                    <div
                      className={`text-sm font-semibold ${
                        c.status === "calibrated"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {c.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edge Validation */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">🎯 Edge Validation</h2>
            <span
              className={`rounded px-2 py-1 text-sm font-semibold ${
                data.edge.health === "✓ Healthy"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {data.edge.health}
            </span>
          </div>

          <p className="mb-4 text-sm text-gray-600">{data.edge.summary}</p>

          {data.edge.warnings.length > 0 && (
            <div className="mb-4 rounded bg-red-50 p-3">
              <div className="text-sm font-semibold text-red-800">Warnings:</div>
              <ul className="mt-1 list-inside space-y-1 text-sm text-red-700">
                {data.edge.warnings.map((w: string, i: number) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {data.edge.breakdown.map((e: any, i: number) => (
              <div
                key={i}
                className={`rounded border p-3 ${
                  e.usable
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{e.edge_range}</div>
                    <div className="text-sm text-gray-600">
                      {e.bets} bets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Win: {e.win_rate}</div>
                    <div className="text-sm">ROI: {e.roi}</div>
                    <div className="text-xs text-gray-500">
                      ${e.total_profit.toFixed(0)} profit
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-lg bg-blue-50 p-4 text-center text-sm text-blue-700">
          Auto-refreshing every 5 seconds
        </div>
      </div>
    </div>
  );
}
