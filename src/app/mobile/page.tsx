"use client";

import StateBar from "@/components/StateBar";
import SignalFeed from "@/components/SignalFeed";
import Controls from "@/components/Controls";
import { Signal } from "@/lib/hooks/useSignals";

export default function MobileCockpit() {
  const handleBet = async (signal: Signal) => {
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixture_id: signal.fixture_id,
          action: "BET",
          stake: signal.decision.stake,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`Bet placed: ${result.bet_id}`);
      } else {
        alert(`Bet blocked: ${result.reason}`);
      }
    } catch (err) {
      console.error("Execution error:", err);
      alert("Execution failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 space-y-4 pb-40">
      <h1 className="text-2xl font-bold">Control Cockpit</h1>

      <StateBar />

      <div>
        <h2 className="text-lg font-bold mb-3">Live Signals</h2>
        <SignalFeed onBet={handleBet} />
      </div>

      {/* Sticky Controls at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        <Controls />
      </div>
    </div>
  );
}
