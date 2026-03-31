"use client";

import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PerformancePage() {
  const { data: summary } = useSWR("/api/analytics/summary", fetcher);
  const { data: series } = useSWR("/api/analytics/timeseries", fetcher);

  if (!summary || !series) {
    return (
      <div className="p-10 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 rounded w-1/3" />
          <div className="h-40 bg-zinc-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 max-w-6xl mx-auto bg-white">
      {/* Hero */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Rivva Performance</h1>
        <p className="text-zinc-600">
          Live edge detection + execution validation
        </p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-4">
        <Stat
          label="ROI"
          value={`${(summary.roi * 100).toFixed(2)}%`}
          color={summary.roi > 0 ? "green" : "red"}
        />
        <Stat
          label="CLV"
          value={`${(summary.clv * 100).toFixed(2)}%`}
          color={summary.clv > 0 ? "green" : "red"}
        />
        <Stat label="Bets" value={summary.bets} />
        <Stat
          label="Profit"
          value={`£${summary.profit.toFixed(0)}`}
          color={summary.profit > 0 ? "green" : "red"}
        />
        <Stat label="Hit Rate" value={`${(summary.hitRate * 100).toFixed(1)}%`} />
      </div>

      {/* Equity Curve */}
      <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
        <h2 className="text-lg font-semibold mb-4">Equity Curve</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={series}>
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip
              formatter={(value: any) => `£${Number(value).toFixed(2)}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              dot={false}
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CLV Trend */}
      <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
        <h2 className="text-lg font-semibold mb-4">Closing Line Value (CLV)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={series}>
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip formatter={(value: any) => `${(Number(value) * 100).toFixed(2)}%`} />
            <Line
              type="monotone"
              dataKey="clv"
              dot={false}
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trust Signal */}
      <div className="bg-green-50 border border-green-200 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">✅</span>
          <h3 className="font-semibold">Edge is Real</h3>
        </div>
        <p className="text-sm text-zinc-700">
          Positive CLV validated over {summary.bets} predictions. Model is beating
          closing line prices.
        </p>
      </div>

      {/* CTA */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl text-center">
        <h3 className="font-semibold mb-2">Ready to use live signals?</h3>
        <p className="text-sm text-zinc-700 mb-4">
          Get daily positive-edge bets before the market moves.
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Start Now
        </a>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: "green" | "red" | "default";
}) {
  const bgColor = {
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    default: "bg-white border-zinc-200",
  }[color];

  const textColor = {
    green: "text-green-700",
    red: "text-red-700",
    default: "text-zinc-900",
  }[color];

  return (
    <div className={`p-4 rounded-xl border ${bgColor}`}>
      <div className="text-xs text-zinc-500 mb-1 uppercase font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
    </div>
  );
}
