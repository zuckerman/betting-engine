"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { data: summary } = useSWR("/api/analytics/summary", fetcher, {
    refreshInterval: 60000,
  });
  const { data: signals } = useSWR("/api/signals", fetcher, {
    refreshInterval: 30000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 border-b">
        <div className="text-2xl font-bold">Rivva</div>
        <div className="flex gap-6">
          <Link href="/performance" className="text-gray-600 hover:text-black">
            Performance
          </Link>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-black text-white">
            Login
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center py-32 px-6 border-b">
        <h1 className="text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
          Find positive EV bets before the market moves
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Verified by closing line value. Track every edge. Know exactly when
          you&apos;re ahead.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/signals"
            className="px-8 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-900"
          >
            View Live Signals
          </Link>
          <Link
            href="/performance"
            className="px-8 py-4 border-2 border-black rounded-xl font-semibold hover:bg-gray-50"
          >
            See Performance
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Tracked against closing odds. No cherry-picking.
        </p>
      </section>

      {/* PROOF SECTION */}
      {summary && (
        <section className="py-20 px-6 border-b">
          <h2 className="text-3xl font-bold text-center mb-12">
            Real performance metrics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StatCard
              label="30-day ROI"
              value={`+${(summary.roi * 100).toFixed(2)}%`}
              color="green"
            />
            <StatCard
              label="Bets Tracked"
              value={summary.bets}
              color="blue"
            />
            <StatCard
              label="Closing Line Value"
              value={`+${(summary.clv * 100).toFixed(2)}%`}
              color="green"
            />
            <StatCard
              label="Total Profit"
              value={`£${summary.profit.toFixed(0)}`}
              color="green"
            />
          </div>

          <p className="text-center text-sm text-gray-600 mt-8">
            Based on all settled bets since system launch. Real data, no
            simulation.
          </p>
        </section>
      )}

      {/* LIVE SIGNALS PREVIEW */}
      <section className="py-20 px-6 border-b">
        <h2 className="text-3xl font-bold text-center mb-12">
          Live edge detection
        </h2>

        <div className="max-w-3xl mx-auto space-y-3">
          {signals && signals.length > 0 ? (
            <>
              {signals.slice(0, 2).map((signal: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 border rounded-xl hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {signal.homeTeam} vs {signal.awayTeam}
                      </div>
                      <div className="text-sm text-gray-600">
                        {signal.market} @ {signal.oddsTaken?.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        +{(signal.edge * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500">edge</div>
                    </div>
                  </div>
                </div>
              ))}

              {signals.length > 2 && (
                <div className="p-4 border rounded-xl blur-sm opacity-50 bg-gray-50">
                  <div className="font-semibold text-gray-400">
                    {signals.length - 2} more signals available...
                  </div>
                </div>
              )}

              <p className="text-center text-sm text-gray-600 mt-6">
                Upgrade to see all signals and place bets automatically
              </p>
            </>
          ) : (
            <div className="text-center text-gray-600">No signals available right now</div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 border-b">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <Step number={1} title="Model scans" description="Analyzes odds across all major leagues" />
          <Step number={2} title="Identifies edge" description="Finds mispriced odds vs model probability" />
          <Step number={3} title="Tracks closing odds" description="Records actual CLV (closing line value)" />
          <Step number={4} title="Shows only winners" description="Only positive EV bets displayed" />
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-6 border-b">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PricingCard
            tier="Free"
            price="£0"
            period="/month"
            features={["2 signals per day", "Performance dashboard", "Email updates"]}
            cta="Get Started"
            href="/login"
          />

          <PricingCard
            tier="Pro"
            price="£29"
            period="/month"
            features={[
              "Full signal feed",
              "Live alerts (Slack/Email)",
              "Advanced analytics",
              "Closing line tracking",
              "Auto-execution (coming soon)",
            ]}
            cta="Start Free Trial"
            href="/login"
            highlight={true}
          />
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          Cancel anytime. No lock-in. 7-day free trial for Pro.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-4xl font-bold mb-6">Start seeing real edge</h2>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Track every bet. Know your edge. Verify your model. Join traders who
          use data, not gut.
        </p>

        <Link
          href="/login"
          className="inline-block px-10 py-5 bg-black text-white text-lg rounded-xl font-semibold hover:bg-gray-900"
        >
          Get Access Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center text-gray-600 text-sm">
        <p>
          Rivva — Autonomous betting platform for serious traders.{" "}
          <a href="/performance" className="underline">
            See our verified stats
          </a>
        </p>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "green" | "blue";
}) {
  return (
    <div className="p-6 rounded-xl border text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div
        className={`text-3xl font-bold mt-2 ${
          color === "green" ? "text-green-600" : "text-blue-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-3 font-bold">
        {number}
      </div>
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  );
}

function PricingCard({
  tier,
  price,
  period,
  features,
  cta,
  href,
  highlight,
}: {
  tier: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-8 rounded-xl border-2 ${
        highlight
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white"
      }`}
    >
      <h3 className="text-2xl font-bold mb-2">{tier}</h3>

      <div className="mb-6">
        <span className={`text-4xl font-bold ${highlight ? "" : "text-black"}`}>
          {price}
        </span>
        <span className={`text-sm ${highlight ? "text-gray-300" : "text-gray-600"}`}>
          {period}
        </span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-lg mt-1">✓</span>
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`block text-center py-3 rounded-lg font-semibold transition ${
          highlight
            ? "bg-white text-black hover:bg-gray-100"
            : "border-2 border-black text-black hover:bg-gray-50"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
