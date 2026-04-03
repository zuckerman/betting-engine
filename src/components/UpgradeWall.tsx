import { useRouter } from 'next/navigation'

export function UpgradeWall() {
  const router = useRouter()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl max-w-sm mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">🔒 Unlock Full Access</h2>
        <p className="text-gray-600 mb-6">
          You&apos;ve reached your free limit. Upgrade to Pro to see all signals.
        </p>

        {/* Proof */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
          <p className="text-sm text-gray-500">Today's signals edge</p>
          <p className="text-2xl font-bold">+6.2%</p>
          <p className="text-xs text-gray-500">Average</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => router.push('/upgrade')}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => router.back()}
            className="w-full border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>

        <p className="text-xs text-center text-gray-500">
          14-day trial • £19/month after • Cancel anytime
        </p>
      </div>
    </div>
  )
}
