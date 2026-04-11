"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GeistMono } from "geist/font/mono";
import StateBar from "@/components/StateBar";
import SignalFeed from "@/components/SignalFeed";
import LiveMetrics from "@/components/LiveMetrics";
import Controls from "@/components/Controls";
import { startScheduler } from "@/lib/scheduler";
import { Signal } from "@/lib/hooks/useSignals";
import SharpMoneyFeed from "@/components/SharpMoneyFeed";

export default function Dashboard() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [betConfirm, setBetConfirm] = useState<string | null>(null);
  const router = useRouter();

  const handleBet = async (signal: Signal) => {
    try {
      await fetch('/api/run-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true, fixture_id: signal.fixture_id }),
      });
    } catch {}
    setBetConfirm(
      `✅ Bet logged: ${signal.home} vs ${signal.away} — ${signal.market} @ ${signal.odds.toFixed(2)} — £${signal.decision.stake}`
    );
    setTimeout(() => setBetConfirm(null), 5000);
  };

  // VALIDATION MODE: Auth disabled + Start signal scheduler
  // Dev user stubbed for local testing
  useEffect(() => {
    // Stub dev user - no auth needed during validation
    setIsPro(true) // Enable all features for testing
    setLoading(false)
    
    // Start automatic signal generation
    startScheduler()
  }, [])

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 h-screen bg-black text-white overflow-hidden">
      {/* TOP BAR */}
      <div className="col-span-12 p-4 border-b border-zinc-800 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Rivva
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/performance" className="text-sm text-gray-400 hover:text-white">
            Performance
          </Link>
          <Link href="/performance/tracker" className="text-sm text-gray-400 hover:text-white">
            P&amp;L Tracker
          </Link>
          <Link href="/dashboard/quant" className="text-sm text-gray-400 hover:text-white">
            Quant Edge System
          </Link>
          <Link href="/arb" className="text-sm text-gray-400 hover:text-white">
            Arb / EV Calc
          </Link>
          <Link href="/edge" className="text-sm text-gray-400 hover:text-white">
            Line Shop
          </Link>
          <Link href="/manager-market" className="text-sm text-gray-400 hover:text-white">
            Manager Market
          </Link>
          {!isPro && (
            <button 
              onClick={handleUpgrade}
              className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
            >
              Upgrade to Pro
            </button>
          )}
          <button 
            onClick={() => {
              document.cookie = 'rivva_pin=; path=/; max-age=0'
              router.push('/auth/login')
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {/* LEFT — Signals (4 columns) */}
      <div className="col-span-4 p-4 overflow-y-auto border-r border-zinc-800 scrollbar-hide">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-4">Signal Terminal</h1>
          <StateBar />
          {!isPro && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-200">
                📊 Upgrade to Pro to see all signals
              </p>
            </div>
          )}
          {betConfirm && (
            <div className="mb-3 p-3 bg-green-900/40 border border-green-600/50 rounded-lg text-green-300 text-sm">
              {betConfirm}
            </div>
          )}
          <SignalFeed isPro={isPro} onBet={handleBet} />
        </div>
      </div>

      {/* CENTRE — Sharp Money (3 columns) */}
      <div className="col-span-3 p-4 border-r border-zinc-800 overflow-y-auto scrollbar-hide">
        <div className="sticky top-0">
          <h2 className="text-lg font-bold mb-1">Sharp Money</h2>
          <p className="text-xs text-zinc-500 mb-4">Betfair volume &amp; steam alerts</p>
          <SharpMoneyFeed />
        </div>
      </div>

      {/* RIGHT — Metrics + Controls (2 columns) */}
      <div className={`col-span-2 p-4 overflow-y-auto scrollbar-hide ${GeistMono.className}`}>
        <div className="sticky top-0 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4">Live Metrics</h2>
            <LiveMetrics />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">Control</h2>
            <Controls />
          </div>
        </div>
      </div>
    </div>
  );
}
