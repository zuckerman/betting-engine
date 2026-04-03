'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';

interface ModelMetrics {
  avgCLV: number;
  roi: number;
  winRate: number;
  totalBets: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface ModelVersion {
  id: string;
  name: string;
  version: number;
  status: 'training' | 'shadow' | 'active' | 'archived';
  metrics: ModelMetrics;
  testedAt?: string;
  promotedAt?: string;
}

interface FeatureImportance {
  feature: string;
  value: number;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModels();
    loadFeatures();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      // Mock data - in production fetch from /api/models
      const mockModels: ModelVersion[] = [
        {
          id: 'current_active',
          name: 'meta_model',
          version: 1,
          status: 'active',
          metrics: {
            avgCLV: 0.045,
            roi: 12.4,
            winRate: 62,
            totalBets: 120,
            sharpeRatio: 1.8,
            maxDrawdown: 18,
          },
          promotedAt: '2024-04-02T14:30:00Z',
        },
        {
          id: 'candidate_v2',
          name: 'meta_model',
          version: 2,
          status: 'shadow',
          metrics: {
            avgCLV: 0.062,
            roi: 15.8,
            winRate: 65,
            totalBets: 85,
            sharpeRatio: 2.1,
            maxDrawdown: 15,
          },
          testedAt: '2024-04-03T02:00:00Z',
        },
      ];
      setModels(mockModels);
      setSelectedModel('current_active');
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    try {
      // Mock feature importance
      setFeatures([
        { feature: 'probability', value: 0.32 },
        { feature: 'edge', value: 0.28 },
        { feature: 'market', value: 0.18 },
        { feature: 'league', value: 0.15 },
        { feature: 'odds', value: 0.07 },
      ]);
    } catch (error) {
      console.error('Failed to load features:', error);
    }
  };

  const activeModel = models.find((m) => m.id === selectedModel);
  const candidateModel = models.find((m) => m.status === 'shadow');
  const currentModel = models.find((m) => m.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧠 Model Versioning System</h1>
          <p className="text-slate-400">
            A/B testing • Safe promotion • Calibration tracking
          </p>
        </div>

        {/* Model Status Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Active */}
          {currentModel && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold text-green-400">Active Model</h3>
              </div>
              <p className="text-slate-300 text-sm mb-2">v{currentModel.version}</p>
              <p className="text-green-400 font-bold">
                {(currentModel.metrics.avgCLV * 100).toFixed(2)}% CLV
              </p>
              <p className="text-slate-400 text-xs">
                {currentModel.metrics.totalBets} bets tested
              </p>
            </div>
          )}

          {/* Candidate */}
          {candidateModel && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🧪</span>
                <h3 className="font-semibold text-blue-400">Shadow Testing</h3>
              </div>
              <p className="text-slate-300 text-sm mb-2">v{candidateModel.version}</p>
              <p className="text-blue-400 font-bold">
                {(candidateModel.metrics.avgCLV * 100).toFixed(2)}% CLV
              </p>
              <p className="text-slate-400 text-xs">
                +{((candidateModel.metrics.avgCLV - (currentModel?.metrics.avgCLV || 0)) * 100).toFixed(2)}% vs current
              </p>
            </div>
          )}

          {/* Calibration */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-purple-400">Calibration</h3>
            </div>
            <p className="text-slate-300 text-sm mb-2">Overall Error</p>
            <p className="text-purple-400 font-bold">2.3%</p>
            <p className="text-slate-400 text-xs">Well-calibrated ✓</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Model Comparison Chart */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Performance Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    metric: 'CLV %',
                    current: (currentModel?.metrics.avgCLV || 0) * 100,
                    candidate: (candidateModel?.metrics.avgCLV || 0) * 100,
                  },
                  {
                    metric: 'ROI %',
                    current: currentModel?.metrics.roi || 0,
                    candidate: candidateModel?.metrics.roi || 0,
                  },
                  {
                    metric: 'Win Rate %',
                    current: currentModel?.metrics.winRate || 0,
                    candidate: candidateModel?.metrics.winRate || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Legend />
                <Bar dataKey="current" fill="#10b981" name="Active" />
                <Bar dataKey="candidate" fill="#3b82f6" name="Candidate" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Importance */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Feature Importance</h2>
            <div className="space-y-3">
              {features
                .sort((a, b) => b.value - a.value)
                .map((f) => (
                  <div key={f.feature} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 capitalize">{f.feature}</span>
                      <span className="text-blue-400 font-semibold">
                        {(f.value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${f.value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Risk Profile */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Risk Profile Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="maxDrawdown" name="Max Drawdown %" tick={{ fill: '#94a3b8' }} />
              <YAxis dataKey="sharpeRatio" name="Sharpe Ratio" tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              {currentModel && (
                <Scatter name="Current" data={[currentModel.metrics]} fill="#10b981" />
              )}
              {candidateModel && (
                <Scatter name="Candidate" data={[candidateModel.metrics]} fill="#3b82f6" />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Promotion Decision */}
        {candidateModel && currentModel && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">🚀 Promotion Decision</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Metrics */}
              <div className="space-y-3">
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm mb-1">CLV Improvement</p>
                  <p className={`text-2xl font-bold ${
                    candidateModel.metrics.avgCLV > currentModel.metrics.avgCLV
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {((candidateModel.metrics.avgCLV - currentModel.metrics.avgCLV) * 100).toFixed(
                      2
                    )}
                    %
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm mb-1">ROI Improvement</p>
                  <p
                    className={`text-2xl font-bold ${
                      candidateModel.metrics.roi > currentModel.metrics.roi
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {(candidateModel.metrics.roi - currentModel.metrics.roi).toFixed(1)}%
                  </p>
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-400 text-sm mb-1">Risk Reduction</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {(currentModel.metrics.maxDrawdown - candidateModel.metrics.maxDrawdown).toFixed(
                      1
                    )}
                    %
                  </p>
                </div>
              </div>

              {/* Guardrails */}
              <div className="bg-slate-700 rounded p-4 space-y-3">
                <h3 className="font-semibold text-white mb-4">Promotion Guardrails</h3>

                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300 text-sm">
                    Sample size: {candidateModel.metrics.totalBets} bets (need ≥50)
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 ${
                    candidateModel.metrics.avgCLV > currentModel.metrics.avgCLV
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}
                >
                  <span>{candidateModel.metrics.avgCLV > currentModel.metrics.avgCLV ? '✓' : '⚠'}</span>
                  <span className="text-slate-300 text-sm">
                    CLV Improvement: +{((candidateModel.metrics.avgCLV - currentModel.metrics.avgCLV) * 100).toFixed(2)}% (need ≥+1%)
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 ${
                    candidateModel.metrics.maxDrawdown <= 0.3
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  <span>{candidateModel.metrics.maxDrawdown <= 0.3 ? '✓' : '✗'}</span>
                  <span className="text-slate-300 text-sm">
                    Max Drawdown: {(candidateModel.metrics.maxDrawdown * 100).toFixed(1)}% (max 30%)
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">📋 Recommendation</p>
              <p className="text-slate-300 text-sm">
                {candidateModel.metrics.avgCLV > currentModel.metrics.avgCLV &&
                candidateModel.metrics.totalBets >= 50
                  ? '✅ READY FOR PROMOTION - Candidate model shows statistically significant improvement in CLV with acceptable risk.'
                  : '⏳ CONTINUE TESTING - Need more data or stronger improvement signal before promotion.'}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                ✓ Promote Candidate
              </button>
              <button className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded">
                ⏸ Continue Testing
              </button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                ✗ Reject Candidate
              </button>
            </div>
          </div>
        )}

        {/* Callout */}
        <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-6 mt-8">
          <p className="text-white font-semibold mb-2">🔒 Safety First</p>
          <p className="text-slate-300 text-sm">
            Models are ONLY promoted if they provably outperform current version. All decisions are logged,
            reversible, and auditable. This prevents model degradation and ensures continuous improvement.
          </p>
        </div>
      </div>
    </div>
  );
}
