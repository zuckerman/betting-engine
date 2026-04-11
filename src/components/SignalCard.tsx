"use client";

import { Signal } from "@/lib/hooks/useSignals";
import { useState } from "react";

interface SignalCardProps {
  signal: Signal;
  onBet?: (signal: Signal) => void;
  onSkip?: (signal: Signal) => void;
}

export default function SignalCard({ signal, onBet, onSkip }: SignalCardProps) {
  const [executing, setExecuting] = useState(false);

  const handleBet = async () => {
    setExecuting(true);
    try {
      if (onBet) {
        await onBet(signal);
      }
    } finally {
      setExecuting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(signal);
    }
  };

  const edge = (signal.edge * 100).toFixed(2);
  const urgencyColor = {
    HIGH: "border-red-500/50 bg-red-900/5",
    MEDIUM: "border-yellow-500/50 bg-yellow-900/5",
    LOW: "border-green-500/50 bg-green-900/5",
  }[signal.urgency] || "border-zinc-800";

  const edgeColor = {
    HIGH: "text-red-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-green-400",
  }[signal.urgency] || "text-green-400";

  return (
    <div className={`bg-zinc-900/50 p-4 rounded-lg border ${urgencyColor} transition-all`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-sm">
            {signal.home} vs {signal.away}
          </div>
          <div className="text-xs text-zinc-400">Fixture #{signal.fixture_id}</div>
        </div>

        <div className={`text-2xl font-bold ${edgeColor}`}>+{edge}%</div>
      </div>

      {/* Market */}
      <div className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">
        {signal.market}
      </div>

      {/* Odds Comparison */}
      <div className="bg-zinc-800/50 p-2 rounded text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-zinc-400">Market odds:</span>
          <span className="font-mono text-white">{signal.odds.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Model odds:</span>
          <span className="font-mono text-green-400">{signal.model_odds.toFixed(2)}</span>
        </div>
      </div>

      {/* Stake */}
      <div className="mb-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-sm">
        <span className="text-zinc-400">Recommended Stake: </span>
        <span className="font-bold text-white">£{signal.decision.stake}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleBet}
          disabled={executing}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-900 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          {executing ? "Placing..." : "BET"}
        </button>

        <button
          onClick={handleSkip}
          disabled={executing}
          className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          SKIP
        </button>
      </div>
    </div>
  );
}
