"use client";

import { useState } from "react";
import Link from "next/link";
import StateBar from "@/components/StateBar";
import SignalFeed from "@/components/SignalFeed";
import LiveMetrics from "@/components/LiveMetrics";
import Controls from "@/components/Controls";

export default function Dashboard() {
  const [isPro] = useState(false); // TODO: connect to auth

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
          {!isPro && (
            <button className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 rounded">
              Upgrade
            </button>
          )}
          <button className="text-sm text-gray-400 hover:text-white">
            Logout
          </button>
        </div>
      </div>

      {/* LEFT — Signals (7 columns) */}
      <div className="col-span-7 p-4 overflow-y-auto border-r border-zinc-800 scrollbar-hide">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-4">Signal Terminal</h1>
          <StateBar />
          <SignalFeed />
        </div>
      </div>

      {/* CENTER-RIGHT — Metrics (3 columns) */}
      <div className="col-span-3 p-4 border-r border-zinc-800 overflow-y-auto scrollbar-hide">
        <div className="sticky top-0">
          <h2 className="text-lg font-bold mb-4">Live Metrics</h2>
          <LiveMetrics />
        </div>
      </div>

      {/* RIGHT — Controls (2 columns) */}
      <div className="col-span-2 p-4 overflow-y-auto scrollbar-hide">
        <div className="sticky top-0">
          <h2 className="text-lg font-bold mb-4">Control</h2>
          <Controls />
        </div>
      </div>
    </div>
  );
}
