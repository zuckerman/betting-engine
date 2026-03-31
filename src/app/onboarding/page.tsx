"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNext = async () => {
    if (step === 3) {
      setLoading(true);
      try {
        // Mark user as onboarded
        // TODO: Call API to update user.onboarded = true
        localStorage.setItem("onboarded", "true");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const steps = [
    {
      title: "This is not a tipster",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-gray-700">
            Rivva finds mispriced odds before the market corrects.
          </p>
          <p className="text-gray-600">
            Every signal is tracked against closing odds (CLV). Positive CLV
            means you&apos;ve beat the market.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm">
              💡 <strong>Key:</strong> Edge is measured by CLV, not
              short-term wins.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "How to use signals",
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-lg">📍</span>
              <span>Take bets close to posted odds</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">⏰</span>
              <span>Don&apos;t chase movement after posting</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">📊</span>
              <span>Follow consistently — edge plays out over volume</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">🎯</span>
              <span>Mix signals across markets to avoid correlation</span>
            </li>
          </ul>
          <p className="text-sm text-gray-600 mt-6">
            Most users fail by skipping consistency. You won&apos;t.
          </p>
        </div>
      ),
    },
    {
      title: "Bankroll rules (important)",
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-lg">💰</span>
              <span>Use flat stake (1–2% of bankroll per bet)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">📈</span>
              <span>Expect variance — expect downswings</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">🔁</span>
              <span>Edge compounds with volume</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">⛔</span>
              <span>Never increase stakes to recover losses</span>
            </li>
          </ul>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm font-semibold">
              ⚠️ Most losses come from chasing losses, not bad predictions.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "You&apos;re ready",
      content: (
        <div className="space-y-6 text-center">
          <div className="text-6xl">🚀</div>
          <p className="text-xl text-gray-700">
            You understand the system. Now go prove it.
          </p>
          <p className="text-gray-600">
            Check today&apos;s signals and start tracking your edge.
          </p>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm">
              ✅ Edge is verified by CLV over time. Trust the process.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold">{current.title}</h1>
            <span className="text-sm text-gray-500">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="py-8 min-h-64">{current.content}</div>

        {/* Navigation */}
        <div className="flex justify-between gap-4 mt-12">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="px-6 py-3 rounded-lg border border-gray-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Loading..." : step === 3 ? "Finish" : "Next"}
          </button>
        </div>

        {/* Skip link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/dashboard" className="underline hover:text-gray-700">
            Skip to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
