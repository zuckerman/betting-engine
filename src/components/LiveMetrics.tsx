"use client";

import { useSystemState } from "@/lib/hooks/useSystemState";

export default function LiveMetrics() {
  const { state, isLoading } = useSystemState();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-zinc-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Bets",
      value: state.totalBetsPlaced,
      unit: "",
      color: "text-blue-400",
    },
    {
      label: "ROI (Today)",
      value: (state.roi || 0).toFixed(2),
      unit: "%",
      color: state.roi > 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: "Calibration",
      value: (state.calibrationError || 0).toFixed(1),
      unit: "%",
      color: state.calibrationError > 12 ? "text-red-400" : "text-green-400",
    },
    {
      label: "Drawdown Risk",
      value: (state.drawdown || 0).toFixed(1),
      unit: "%",
      color: state.drawdown > 15 ? "text-red-400" : "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Live Metrics
      </div>

      {metrics.map((metric) => (
        <div key={metric.label} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400 mb-1">{metric.label}</div>
          <div className={`text-2xl font-bold ${metric.color}`}>
            {metric.value}
            <span className="text-sm text-zinc-500 ml-1">{metric.unit}</span>
          </div>
        </div>
      ))}

      {/* Status Indicator */}
      <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 mt-4">
        <div className="text-xs text-zinc-400 mb-1">System Status</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              state.status === "🟢"
                ? "bg-green-500 animate-pulse"
                : state.status === "🟡"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            }`}
          />
          <div className="text-sm font-semibold">{state.state}</div>
        </div>
      </div>
    </div>
  );
}
