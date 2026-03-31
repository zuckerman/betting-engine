"use client";

import { useSystemState } from "@/lib/hooks/useSystemState";

export default function StateBar() {
  const { state, isLoading } = useSystemState();

  if (isLoading) {
    return (
      <div className="bg-zinc-900 p-3 rounded-xl flex justify-between items-center animate-pulse">
        <div className="h-4 w-24 bg-zinc-700 rounded" />
      </div>
    );
  }

  const statusColor = {
    "🟢": "text-green-400",
    "🟡": "text-yellow-400",
    "🔴": "text-red-400",
    "⚫": "text-zinc-500",
  }[state.status] || "text-zinc-500";

  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <div className="flex justify-between items-center mb-3">
        <div className={`font-bold text-lg ${statusColor}`}>
          {state.status} {state.state}
        </div>
        <div className="text-xs text-zinc-400">
          Updated {new Date(state.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div>
          <div className="text-zinc-400">Bankroll</div>
          <div className="font-bold text-white">
            £{(state.bankroll || 0).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-zinc-400">ROI (7d)</div>
          <div className={`font-bold ${state.roi7d > 0 ? "text-green-400" : "text-red-400"}`}>
            {(state.roi7d || 0).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400">Avg Edge</div>
          <div className="font-bold text-green-400">
            +{(state.avgEdge * 100 || 0).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400">Drawdown</div>
          <div className={`font-bold ${state.drawdown > 15 ? "text-red-400" : "text-yellow-400"}`}>
            -{(state.drawdown || 0).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400">Win Rate</div>
          <div className={`font-bold ${state.recentWinRate > 0.5 ? "text-green-400" : "text-red-400"}`}>
            {((state.recentWinRate || 0) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {state.calibrationError > 12 && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
          ⚠️ Model calibration drift detected ({(state.calibrationError || 0).toFixed(1)}% error)
        </div>
      )}
    </div>
  );
}
