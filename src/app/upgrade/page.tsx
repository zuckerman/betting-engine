'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error: ' + (data.error || 'Failed to create checkout'))
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 border-b bg-white z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Rivva</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-black"
          >
            Back to dashboard
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Headline */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Unlock the Full Edge</h2>
          <p className="text-lg text-gray-600">
            Get unlimited access to live signals, edge analysis, and performance tracking.
          </p>
        </div>

        {/* Social proof */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold">68%</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-gray-500">Avg ROI</p>
            <p className="text-2xl font-bold text-green-600">+12.4%</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-gray-500">Avg CLV</p>
            <p className="text-2xl font-bold">+0.83</p>
          </div>
        </div>

        {/* What you get */}
        <div className="mb-12 p-6 bg-gray-50 rounded-xl">
          <h3 className="font-semibold mb-4">What&apos;s included:</h3>
          <ul className="space-y-2 text-sm">
            <li>✓ Unlimited live signals</li>
            <li>✓ Closing line value (CLV) tracking</li>
            <li>✓ Performance dashboard & ROI charts</li>
            <li>✓ Portfolio optimisation</li>
            <li>✓ Bankroll tracking</li>
            <li>✓ Community insights</li>
          </ul>
        </div>

        {/* Pricing card */}
        <div className="border-2 border-black p-8 rounded-2xl text-center mb-8">
          <p className="text-lg font-semibold mb-2">Pro Access</p>
          <p className="text-4xl font-bold mb-2">£19</p>
          <p className="text-sm text-gray-600 mb-6">/month • 14-day free trial • Cancel anytime</p>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating checkout...' : 'Start Free Trial'}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            No credit card required for trial
          </p>
        </div>

        {/* CLV explanation */}
        <div className="p-6 bg-gray-50 rounded-xl">
          <h3 className="font-semibold mb-2">Why CLV matters</h3>
          <p className="text-sm text-gray-600">
            Closing Line Value measures whether you consistently beat the market. Positive CLV means you're getting better odds than the bookmakers' final assessment — the core metric professional bettors use to prove edge.
          </p>
        </div>
      </div>
    </div>
  )
}
