"use client"

import Link from "next/link"
import { GeistMono } from "geist/font/mono"
import ValueBetFeed from "@/components/ValueBetFeed"

export default function ValueBetsPage() {
  return (
    <div className={`min-h-screen bg-black text-white ${GeistMono.className}`}>
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-zinc-500 text-sm hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold mt-1">Value Bet Scanner</h1>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/arb" className="hover:text-white">Arb / EV</Link>
          <Link href="/edge" className="hover:text-white">Line Shop</Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-emerald-700/40 rounded-xl p-4">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">How it works</div>
            <div className="text-zinc-300 text-xs leading-relaxed">
              Pinnacle sets the sharpest true-probability odds. We remove their vig to get the fair price, then scan soft bookmakers for anything priced above it — that gap is your edge.
            </div>
          </div>
          <div className="bg-zinc-900 border border-yellow-700/40 rounded-xl p-4">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">Target yield</div>
            <div className="text-zinc-300 text-xs leading-relaxed">
              RebelBetting reports 3.7% avg yield. Our scanner flags everything above your chosen minimum edge (2–5%). Long-run ROI compounds fast at these rates.
            </div>
          </div>
          <div className="bg-zinc-900 border border-blue-700/40 rounded-xl p-4">
            <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Refresh rate</div>
            <div className="text-zinc-300 text-xs leading-relaxed">
              Scans every 2 minutes. Value bets close quickly as books adjust — act on HIGH confidence bets first, they carry the most edge before the market corrects.
            </div>
          </div>
        </div>

        <ValueBetFeed />
      </div>
    </div>
  )
}
