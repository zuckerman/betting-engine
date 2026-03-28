"use client";

import { useState } from "react";
import {
  smallSampleBets,
  negativeEdgeBets,
  positiveEdgeBets,
  marginalBets,
  varianceBets,
  overfitBets,
  mixedStrategyBets,
} from "@/lib/engine/testData";
import { ScoringResult } from "@/lib/engine/types";

const scenarios = [
  { name: "Small Sample (BLACK)", data: smallSampleBets },
  { name: "Negative Edge (RED)", data: negativeEdgeBets },
  { name: "Positive Edge (GREEN)", data: positiveEdgeBets },
  { name: "Marginal Edge (AMBER)", data: marginalBets },
  { name: "Variance Drawdown (AMBER+)", data: varianceBets },
  { name: "Overfit Detection (AMBER-)", data: overfitBets },
  { name: "Mixed Strategy (AMBER)", data: mixedStrategyBets },
];

export default function TestPage() {
  const [results, setResults] = useState<Record<string, ScoringResult>>({});
  const [loading, setLoading] = useState(false);

  const runAllScenarios = async () => {
    setLoading(true);
    const newResults: Record<string, ScoringResult> = {};

    for (const scenario of scenarios) {
      try {
        const response = await fetch("/api/bettor/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bets: scenario.data }),
        });

        const result = await response.json();
        newResults[scenario.name] = result;
      } catch (error) {
        console.error(`Error scoring ${scenario.name}:`, error);
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "GREEN":
        return "bg-green-900 border-green-700";
      case "RED":
        return "bg-red-900 border-red-700";
      case "AMBER":
        return "bg-yellow-900 border-yellow-700";
      case "BLACK":
        return "bg-gray-900 border-gray-700";
      default:
        return "bg-gray-900 border-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Test Suite: Betting Scorer</h1>
        <p className="text-gray-400 mb-8">
          Validate all scoring scenarios and decision rules
        </p>

        <button
          onClick={runAllScenarios}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold mb-8 transition"
        >
          {loading ? "Running Tests..." : "Run All Scenarios"}
        </button>

        <div className="grid gap-6">
          {scenarios.map((scenario) => {
            const result = results[scenario.name];
            return (
              <div
                key={scenario.name}
                className="border border-gray-700 rounded-lg p-6 bg-gray-950"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">
                      {scenario.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {scenario.data.length} bets
                    </p>
                  </div>
                  {result && (
                    <div
                      className={`px-4 py-2 rounded-lg font-bold border ${getStateColor(
                        result.state
                      )}`}
                    >
                      {result.state}
                    </div>
                  )}
                </div>

                {result ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">
                          CLV
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {result.metrics.clv > 0 ? "+" : ""}
                          {(result.metrics.clv * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">
                          xROI
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {result.metrics.xroi > 0 ? "+" : ""}
                          {(result.metrics.xroi * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">
                          ROI
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {result.metrics.roi > 0 ? "+" : ""}
                          {(result.metrics.roi * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">
                          Conf
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {(result.metrics.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">
                          Z-Score
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {result.metrics.z.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-3 rounded">
                      <div className="text-xs text-gray-400 uppercase mb-1">
                        Diagnosis
                      </div>
                      <div className="text-sm">{result.diagnosis}</div>
                    </div>

                    <div className="bg-gray-900 p-3 rounded">
                      <div className="text-xs text-gray-400 uppercase mb-1">
                        Instruction
                      </div>
                      <div className="text-sm font-semibold text-blue-300">
                        {result.instruction}
                      </div>
                    </div>

                    {result.riskFlags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.riskFlags.map((flag) => (
                          <span
                            key={flag}
                            className="text-xs bg-orange-900 text-orange-200 px-2 py-1 rounded"
                          >
                            ⚠ {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Click &quot;Run All Scenarios&quot; to test
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">How to Read Results</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <strong>CLV</strong>: Closing Line Value (beating market)
            </li>
            <li>
              <strong>xROI</strong>: Expected ROI based on market odds
            </li>
            <li>
              <strong>ROI</strong>: Actual return on investment
            </li>
            <li>
              <strong>Conf</strong>: Confidence in result (based on sample size)
            </li>
            <li>
              <strong>Z-Score</strong>: Variance test ({Math.abs(2).toFixed(0)}+ = high variance)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
