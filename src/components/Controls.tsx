"use client";

import { useControlMode, ControlMode } from "@/lib/hooks/useControlMode";
import { useState } from "react";

export default function Controls() {
  const { mode, killSwitch, setMode, setKillSwitch } = useControlMode();
  const [loading, setLoading] = useState(false);

  const handleModeChange = async (newMode: ControlMode) => {
    setLoading(true);
    try {
      await setMode(newMode);
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitch = async () => {
    setLoading(true);
    try {
      await setKillSwitch(!killSwitch);
    } finally {
      setLoading(false);
    }
  };

  const modes: ControlMode[] = ["MANUAL", "SEMI_AUTO", "FULL_AUTO"];

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Control Mode
      </div>

      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            disabled={loading}
            className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
              mode === m
                ? m === "MANUAL"
                  ? "bg-blue-600 text-white"
                  : m === "SEMI_AUTO"
                    ? "bg-yellow-600 text-white"
                    : "bg-red-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            } disabled:opacity-50`}
          >
            {m === "FULL_AUTO" ? "FULL" : m === "SEMI_AUTO" ? "SEMI" : "MANUAL"}
          </button>
        ))}
      </div>

      <div className="text-xs text-zinc-400 mt-4">
        {mode === "MANUAL" && "🟦 Manual: You place all bets"}
        {mode === "SEMI_AUTO" && "🟨 Semi-Auto: System sizes, you confirm"}
        {mode === "FULL_AUTO" && "🟥 Full-Auto: System executes immediately"}
      </div>

      {/* Kill Switch */}
      <div className="pt-4 border-t border-zinc-800">
        <button
          onClick={handleKillSwitch}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
            killSwitch
              ? "bg-red-600 text-white animate-pulse"
              : "bg-red-900/30 border border-red-700/50 text-red-400 hover:bg-red-900/50"
          } disabled:opacity-50`}
        >
          {killSwitch ? "🛑 KILL SWITCH ACTIVE" : "🔴 Kill Switch (Off)"}
        </button>
      </div>

      <div className="text-xs text-zinc-500 text-center">
        Emergency execution stop
      </div>
    </div>
  );
}
