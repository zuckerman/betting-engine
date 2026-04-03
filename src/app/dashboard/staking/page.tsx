'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface KellyRecommendation {
  odds: number;
  predictedProb: number;
  bankroll: number;
  recommendedStake: number;
  kellyFraction: number;
  expectedValue: number;
  riskOfRuin: number;
}

interface SegmentWeight {
  segment: string;
  weight: number;
  clv: number;
  bets: number;
}

export default function StakingDashboard() {
  const [activeTab, setActiveTab] = useState<'kelly' | 'bankroll' | 'weights'>('kelly');
  const [loading, setLoading] = useState(false);

  // Kelly state
  const [kellyInput, setKellyInput] = useState({
    odds: 2.5,
    probability: 0.55,
    bankroll: 1000,
    kellyFraction: 0.5,
  });
  const [kellyResult, setKellyResult] = useState<KellyRecommendation | null>(null);

  // Bankroll state
  const [bankrollState, setBankrollState] = useState<any>(null);

  // Weights state
  const [weightData, setWeightData] = useState<SegmentWeight[]>([]);

  // Calculate Kelly
  const handleKellyCalculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kellyInput),
      });

      if (response.ok) {
        const data = await response.json();
        setKellyResult({
          odds: kellyInput.odds,
          predictedProb: kellyInput.probability,
          bankroll: kellyInput.bankroll,
          recommendedStake: data.recommendedStake,
          kellyFraction: data.kellyFraction,
          expectedValue: data.expectedValue,
          riskOfRuin: data.riskOfRuin,
        });
      }
    } catch (error) {
      console.error('Kelly calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load bankroll tracker
  const handleBankrollLoad = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staking');
      if (response.ok) {
        const data = await response.json();
        setBankrollState(data);
      }
    } catch (error) {
      console.error('Bankroll load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load adaptive weights
  const handleWeightsLoad = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      setWeightData([
        { segment: 'EPL_BTTS', weight: 0.35, clv: 0.067, bets: 25 },
        { segment: 'EPL_Over', weight: 0.25, clv: 0.043, bets: 18 },
        { segment: 'LaLiga_BTTS', weight: 0.2, clv: 0.028, bets: 12 },
        { segment: 'Bundesliga_Over', weight: 0.15, clv: 0.015, bets: 8 },
        { segment: 'Ligue1_Moneyline', weight: 0.05, clv: -0.02, bets: 3 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleBankrollLoad();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Advanced Staking System</h1>
          <p className="text-slate-400">Kelly Criterion • Bankroll Management • Adaptive Weights</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          {(['kelly', 'bankroll', 'weights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab === 'kelly' && '📊 Kelly Calculator'}
              {tab === 'bankroll' && '💰 Bankroll Tracker'}
              {tab === 'weights' && '⚖️ Adaptive Weights'}
            </button>
          ))}
        </div>

        {/* Kelly Tab */}
        {activeTab === 'kelly' && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Kelly Criterion Calculator</h2>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Decimal Odds
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={kellyInput.odds}
                    onChange={(e) =>
                      setKellyInput({ ...kellyInput, odds: parseFloat(e.target.value) })
                    }
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Your Win Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={kellyInput.probability * 100}
                    onChange={(e) =>
                      setKellyInput({
                        ...kellyInput,
                        probability: parseFloat(e.target.value) / 100,
                      })
                    }
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Bankroll (£)
                  </label>
                  <input
                    type="number"
                    value={kellyInput.bankroll}
                    onChange={(e) =>
                      setKellyInput({ ...kellyInput, bankroll: parseFloat(e.target.value) })
                    }
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Kelly Fraction
                  </label>
                  <select
                    value={kellyInput.kellyFraction}
                    onChange={(e) =>
                      setKellyInput({
                        ...kellyInput,
                        kellyFraction: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600"
                  >
                    <option value="0.25">Quarter Kelly (Safe)</option>
                    <option value="0.5">Half Kelly (Recommended)</option>
                    <option value="1">Full Kelly (Aggressive)</option>
                  </select>
                </div>

                <button
                  onClick={handleKellyCalculate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-2 rounded transition-colors"
                >
                  {loading ? 'Calculating...' : 'Calculate Kelly'}
                </button>
              </div>

              {/* Results */}
              {kellyResult && (
                <div className="space-y-4">
                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">Recommended Stake</p>
                    <p className="text-3xl font-bold text-green-400">
                      £{kellyResult.recommendedStake.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">Kelly Fraction</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {kellyResult.kellyFraction.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">Expected Value</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      £{kellyResult.expectedValue.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">Risk of Ruin</p>
                    <p className={`text-xl font-bold ${
                      kellyResult.riskOfRuin < 1 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {kellyResult.riskOfRuin.toFixed(3)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Education */}
            <div className="bg-slate-700 rounded p-4 border-l-4 border-blue-500">
              <p className="text-slate-300 text-sm">
                <strong>Kelly Formula:</strong> f* = (p × b - q) / b
                <br />
                <strong>Translation:</strong> Bet {kellyResult?.kellyFraction || 0}% of your
                bankroll to maximize long-term growth while managing risk.
                <br />
                <strong>Key Rule:</strong> Never bet more than Kelly recommends - overbetting leads
                to ruin.
              </p>
            </div>
          </div>
        )}

        {/* Bankroll Tab */}
        {activeTab === 'bankroll' && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Bankroll Tracker</h2>

            {bankrollState && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Current Bankroll</p>
                  <p className="text-3xl font-bold text-white">£{bankrollState.bankroll}</p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">P&L</p>
                  <p className="text-3xl font-bold text-green-400">
                    £{bankrollState.state.pnl.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">ROI</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {bankrollState.state.roi.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Max Drawdown</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {bankrollState.state.drawdown.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Min Bet</p>
                  <p className="text-2xl font-bold text-slate-300">
                    £{bankrollState.constraints.minBet.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Max Bet (25% BR)</p>
                  <p className="text-2xl font-bold text-slate-300">
                    £{bankrollState.constraints.maxBet.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {bankrollState?.simulation && (
              <div className="bg-slate-700 rounded p-4 border-l-4 border-green-500">
                <p className="text-white font-semibold mb-2">Projected Performance (100 bets)</p>
                <p className="text-slate-300 text-sm">
                  Expected: £{bankrollState.simulation.expectedEndBankroll}
                  <br />
                  95% Confidence: £{bankrollState.simulation.confidence95Percent.min} to £
                  {bankrollState.simulation.confidence95Percent.max}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Weights Tab */}
        {activeTab === 'weights' && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Adaptive Market Weights</h2>

            <button
              onClick={handleWeightsLoad}
              disabled={loading}
              className="mb-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-2 px-6 rounded transition-colors"
            >
              {loading ? 'Loading...' : 'Load Segment Performance'}
            </button>

            {weightData.length > 0 && (
              <>
                <div className="mb-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="segment" tick={{ fill: '#94a3b8' }} />
                      <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="weight" fill="#3b82f6" name="Allocation %" />
                      <Bar yAxisId="right" dataKey="clv" fill="#10b981" name="Avg CLV" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="border-b border-slate-600">
                      <tr>
                        <th className="text-left py-3 px-4">Market Segment</th>
                        <th className="text-right py-3 px-4">Allocation</th>
                        <th className="text-right py-3 px-4">Avg CLV</th>
                        <th className="text-right py-3 px-4">Total Bets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weightData.map((seg) => (
                        <tr key={seg.segment} className="border-b border-slate-700 hover:bg-slate-700">
                          <td className="py-3 px-4">{seg.segment}</td>
                          <td className="text-right py-3 px-4">
                            <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded">
                              {(seg.weight * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className={`text-right py-3 px-4 font-bold ${
                            seg.clv > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {seg.clv > 0 ? '+' : ''}{seg.clv.toFixed(3)}
                          </td>
                          <td className="text-right py-3 px-4">{seg.bets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 bg-slate-700 rounded p-4 border-l-4 border-purple-500">
                  <p className="text-white font-semibold mb-2">How It Works</p>
                  <p className="text-slate-300 text-sm">
                    The system automatically allocates more of your bankroll to market segments
                    with positive CLV. EPL BTTS has the strongest edge (6.7%), so it gets 35% of
                    bets. Weak segments get explored with 5-15% allocation to test for new
                    opportunities.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
