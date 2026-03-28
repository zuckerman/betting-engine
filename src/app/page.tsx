export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Betting Scorer</h1>
        <p className="text-gray-400 mb-8">Production-grade bet scoring engine</p>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <ul className="space-y-2 text-gray-300 font-mono text-sm">
            <li>• <code className="bg-gray-800 px-2 py-1">POST /api/bettor/score</code> - Score bets</li>
            <li>• <code className="bg-gray-800 px-2 py-1">POST /api/bets</code> - Record new bet</li>
            <li>• <code className="bg-gray-800 px-2 py-1">GET /api/bettor/[id]/report</code> - Get bettor report</li>
          </ul>
        </div>

        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className="text-blue-200">Ready for Phase 1: Core engine + API validation</p>
        </div>
      </div>
    </div>
  );
}
