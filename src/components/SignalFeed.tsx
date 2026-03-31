"use client";

import { useSignals, Signal } from "@/lib/hooks/useSignals";
import SignalCard from "./SignalCard";
import { useState } from "react";

interface SignalFeedProps {
  onBet?: (signal: Signal) => void;
  onSkip?: (signal: Signal) => void;
}

export default function SignalFeed({ onBet, onSkip }: SignalFeedProps) {
  const { signals, isLoading, error } = useSignals();
  const [skippedIds, setSkippedIds] = useState<Set<string | number>>(new Set());

  const handleSkip = (signal: Signal) => {
    setSkippedIds((prev) => new Set(prev).add(signal.fixture_id));
    onSkip?.(signal);
  };

  const visibleSignals = signals.filter((s) => !skippedIds.has(s.fixture_id));

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
        Error loading signals: {error.message}
      </div>
    );
  }

  if (isLoading && signals.length === 0) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  if (visibleSignals.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-400 mt-4">
        {signals.length === 0
          ? "No signals currently available"
          : "All signals skipped"}
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="text-xs text-zinc-400">
        {visibleSignals.length} {visibleSignals.length === 1 ? "signal" : "signals"} available
      </div>

      {visibleSignals.map((signal) => (
        <SignalCard
          key={signal.fixture_id}
          signal={signal}
          onBet={onBet}
          onSkip={handleSkip}
        />
      ))}
    </div>
  );
}
