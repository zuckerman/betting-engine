"use client"

import Link from "next/link"
import { GeistMono } from "geist/font/mono"
import LineShopPanel from "@/components/LineShopPanel"

export default function EdgeToolsPage() {
  return (
    <div className={`min-h-screen bg-black text-white ${GeistMono.className}`}>
      {/* Top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-zinc-500 text-sm hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold mt-1">Edge Tools</h1>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/performance/tracker" className="hover:text-white">P&L Tracker</Link>
          <Link href="/dashboard/quant" className="hover:text-white">Quant</Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto space-y-8">

        {/* Strategy cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-emerald-700/40 rounded-xl p-4">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Line Shopping</div>
            <div className="text-white font-semibold mb-1">Best price across all books</div>
            <div className="text-zinc-400 text-xs">Even 0.05 better odds on every bet adds ~3–5% to long-term ROI. Always take the best available price.</div>
          </div>
          <div className="bg-zinc-900 border border-yellow-700/40 rounded-xl p-4">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">Arbitrage</div>
            <div className="text-white font-semibold mb-1">Guaranteed profit, zero risk</div>
            <div className="text-zinc-400 text-xs">When combined best odds across books imply &lt;100% probability — bet all outcomes for risk-free profit. Closes within minutes.</div>
          </div>
          <div className="bg-zinc-900 border border-blue-700/40 rounded-xl p-4">
            <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Fade the Public</div>
            <div className="text-white font-semibold mb-1">Follow sharp money</div>
            <div className="text-zinc-400 text-xs">Reverse line movement means pros are betting against the crowd. The public inflates popular team odds — fade them.</div>
          </div>
        </div>

        {/* Line shopper */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold">Line Shopper + Arb Scanner</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Live odds across Pinnacle, Bet365, William Hill, Sky Bet, Betway, Unibet + more.
              Green % = how much better the best available price is vs. Pinnacle (sharp reference).
              <span className="text-emerald-400 font-semibold"> ARB</span> = guaranteed profit across books.
            </p>
          </div>
          <LineShopPanel />
        </div>

      </div>
    </div>
  )
}
