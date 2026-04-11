"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SignalsPage() {
  const { data: signals, isLoading } = useSWR("/api/signals", fetcher, {
    refreshInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 border-b">
        <Link href="/" className="text-2xl font-bold">
          Rivva
        </Link>
        <div className="flex gap-6">
          <Link href="/performance" className="text-gray-600 hover:text-black">
            Performance
          </Link>
          <Link href="/auth/login" className="text-gray-600 hover:text-black">
            Login
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-2">Live Signals</h1>
        <p className="text-gray-600 mb-8">
          Real-time edge detection for football markets
        </p>

        {isLoading ? (
          <div className="text-gray-600">Loading signals...</div>
        ) : signals && signals.length > 0 ? (
          <div className="space-y-4">
            {signals.map((signal: any) => (
              <div
                key={signal.id}
                className="p-6 border rounded-xl hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xl font-bold">
                      {signal.homeTeam} vs {signal.awayTeam}
                    </div>
                    <div className="text-sm text-gray-600">
                      {signal.market} • {signal.selection}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      +{(signal.edge * 100).toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">edge</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Odds:</span>
                    <div className="font-mono font-semibold">
                      {signal.oddsTaken.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Stake:</span>
                    <div className="font-semibold">£{signal.stake}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <div className="font-semibold">{signal.confidence}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600">No signals available</div>
        )}

        {/* Login prompt */}
        <div className="mt-12 p-8 bg-gray-50 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-3">Want to track these bets?</h2>
          <p className="text-gray-600 mb-6">
            Sign in to see personalized signals and place bets automatically
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
