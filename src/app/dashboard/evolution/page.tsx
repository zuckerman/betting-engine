'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, Cell,
} from 'recharts';

interface Strategy {
  id: string;
  name: string;
  clv: number;
  roi: number;
  bets: number;
  age?: string;
}

interface EdgeHealth {
  state: 'strong' | 'stable' | 'declining' | 'decayed';
  clvRecent: number;
  explorationMultiplier: number;
  confidence: number;
}

export default function EvolutionDashboard() {
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null);
  const [shadows, setShadows] = useState<Strategy[]>([]);
  const [edgeHealth, setEdgeHealth] = useState<EdgeHealth | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data
  const mockCLVHistory = [
    { period: '28-35d', clv: 0.035, confidence: 0.6 },
    { period: '21-28d', clv: 0.042, confidence: 0.7 },
    { period: '14-21d', clv: 0.048, confidence: 0.8 },
    { period: '7-14d', clv: 0.051, confidence: 0.85 },
    { period: '0-7d', clv: 0.045, confidence: 0.9 },
  ];

  const mockStrategies = [
    {
      id: 'strat_active',
      name: 'Active (v12)',
      clv: 0.045,
      roi: 12.4,
      bets: 234,
    },
    {
      id: 'strat_shadow1',
      name: 'Shadow v13 (mutated)',
      clv: 0.052,
      roi: 14.1,
      bets: 67,
    },
    {
      id: 'strat_shadow2',
      name: 'Shadow v13b (crossover)',
      clv: 0.048,
      roi: 13.2,
      bets: 42,
    },
    {
      id: 'strat_shadow3',
      name: 'Shadow v14 (high-kelly)',
      clv: -0.008,
      roi: -2.1,
      bets: 28,
    },
  ];

  useEffect(() => {
    loadStrategyStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStrategyStatus = async () => {
    setLoading(true);
    try {
      setActiveStrategy(mockStrategies[0]);
      setShadows(mockStrategies.slice(1));
      setEdgeHealth({
        state: 'stable',
        clvRecent: 0.045,
        explorationMultiplier: 1.0,
        confidence: 0.9,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'strong':
        return '#10b981';
      case 'stable':
        return '#3b82f6';
      case 'declining':
        return '#f59e0b';
      case 'decayed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStateEmoji = (state: string) => {
    switch (state) {
      case 'strong':
        return '💪';
      case 'stable':
        return '✅';
      case 'declining':
        return '📉';
      case 'decayed':
        return '🚨';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧬 System Evolution</h1>
          <p className="text-slate-400">Auto-generating & testing strategy variants</p>
        </div>

        {/* System Health */}
        {edgeHealth && (
          <div className="mb-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">System State</p>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <span style={{ color: getStateColor(edgeHealth.state) }}>
                    {getStateEmoji(edgeHealth.state)}
                  </span>
                  <span style={{ color: getStateColor(edgeHealth.state) }}>
                    {edgeHealth.state.charAt(0).toUpperCase() + edgeHealth.state.slice(1)}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Recent CLV</p>
                  <p className={`text-2xl font-bold ${
                    edgeHealth.clvRecent > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(edgeHealth.clvRecent * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Exploration</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {(edgeHealth.explorationMultiplier * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm">Confidence</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(edgeHealth.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLV Trend */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📊 CLV Trajectory</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockCLVHistory}>
              <defs>
                <linearGradient id="colorClv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="period" tick={{ fill: '#94a3b8' }} />
              <YAxis tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                formatter={(value) => `${(value * 100).toFixed(2)}%`}
              />
              <Area
                type="monotone"
                dataKey="clv"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorClv)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Strategy Portfolio */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Active */}
          {activeStrategy && (
            <div className="bg-slate-800 rounded-lg p-6 border border-green-500/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="text-xl font-bold text-white">Active Strategy</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-slate-400 text-sm">{activeStrategy.name}</p>
                  <p className="text-2xl font-bold text-green-400">
                    {(activeStrategy.clv * 100).toFixed(2)}% CLV
                  </p>
                  <p className="text-slate-400 text-xs">
                    {activeStrategy.bets} bets tested
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-700 rounded p-3">
                    <p className="text-slate-400 text-xs">ROI</p>
                    <p className="text-xl font-bold text-blue-400">
                      {activeStrategy.roi?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-slate-700 rounded p-3">
                    <p className="text-slate-400 text-xs">Status</p>
                    <p className="text-xl font-bold text-green-400">Live</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shadows */}
          <div className="bg-slate-800 rounded-lg p-6 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🧪</span>
              <h3 className="text-xl font-bold text-white">Shadow Tests ({shadows.length})</h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shadows.map((s) => (
                <div
                  key={s.id}
                  className={`bg-slate-700 rounded p-3 ${
                    s.clv > (activeStrategy?.clv || 0)
                      ? 'border border-green-500/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-semibold">
                        {s.name}
                      </p>
                      <p className="text-slate-400 text-xs">{s.bets} bets</p>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        s.clv > 0.05
                          ? 'text-green-400'
                          : s.clv > 0
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {(s.clv * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Comparison */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📈 Comparative Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[activeStrategy, ...shadows].filter(Boolean)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                formatter={(value) => `${(value * 100).toFixed(2)}%`}
              />
              <Bar dataKey="clv" fill="#3b82f6" name="CLV" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Promotion Candidates */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">🚀 Promotion Pipeline</h2>

          <div className="space-y-3">
            {shadows
              .filter((s) => s.bets >= 50 && s.clv > (activeStrategy?.clv || 0))
              .map((s) => (
                <div
                  key={s.id}
                  className="bg-gradient-to-r from-green-900/20 to-slate-700 rounded-lg p-4 border border-green-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{s.name}</p>
                      <p className="text-slate-400 text-sm">
                        +{((s.clv - (activeStrategy?.clv || 0)) * 100).toFixed(2)}% vs current
                        ({s.bets} bets)
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        ✓ Promote
                      </button>
                      <button className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded">
                        ⏱ Continue Testing
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {shadows.filter((s) => s.bets >= 50 && s.clv > (activeStrategy?.clv || 0))
              .length === 0 && (
              <p className="text-slate-400 text-sm">No candidates ready for promotion yet.</p>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
          <p className="text-white font-semibold mb-2">🧬 How Evolution Works</p>
          <p className="text-slate-300 text-sm">
            System generates strategy variants based on edge health. Strong CLV triggers
            exploitation, weak CLV triggers exploration. Shadow strategies are tested
            in parallel. Only statistically significant improvements are promoted. This
            creates a self-improving loop that adapts to market conditions automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
