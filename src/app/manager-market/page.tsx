"use client";

import { useEffect, useState, useCallback } from "react";

type Probability = "HIGH" | "MED" | "LOW";
type Status = "AT_RISK" | "LEAVING" | "STABLE" | "INTERIM";

interface OddsEntry {
  date: string;
  value: number;
  source: string;
  notes?: string | null;
}

interface Manager {
  id: string;
  name: string;
  club: string;
  contract_expiry: string | null;
  status: Status;
  predicted_destination: string;
  probability: Probability;
  replacement_target: string;
  notes: string;
  odds: OddsEntry[];
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  AT_RISK: { label: "AT RISK",  color: "text-red-400",     dot: "bg-red-400" },
  LEAVING: { label: "LEAVING",  color: "text-amber-400",   dot: "bg-amber-400" },
  STABLE:  { label: "STABLE",   color: "text-emerald-400", dot: "bg-emerald-400" },
  INTERIM: { label: "INTERIM",  color: "text-sky-400",     dot: "bg-sky-400" },
};

const PROB_CONFIG: Record<Probability, { label: string; width: string; color: string }> = {
  HIGH: { label: "HIGH",   width: "w-full", color: "bg-red-500" },
  MED:  { label: "MEDIUM", width: "w-2/3",  color: "bg-amber-500" },
  LOW:  { label: "LOW",    width: "w-1/3",  color: "bg-slate-500" },
};

function oddsMovement(odds: OddsEntry[]): "shortening" | "drifting" | "flat" {
  if (odds.length < 2) return "flat";
  const diff = odds[odds.length - 1].value - odds[0].value;
  if (diff < -0.5) return "shortening";
  if (diff > 0.5) return "drifting";
  return "flat";
}

function Sparkline({ odds }: { odds: OddsEntry[] }) {
  const vals = odds.map((o) => o.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 80, H = 28, pad = 2;

  const points = vals
    .map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const movement = oddsMovement(odds);
  const stroke =
    movement === "shortening" ? "#f87171" : movement === "drifting" ? "#34d399" : "#94a3b8";

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => {
        const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
        const y = H - pad - ((v - min) / range) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r={i === vals.length - 1 ? 2.5 : 1.5} fill={stroke} />;
      })}
    </svg>
  );
}

function AddOddsForm({ managerId, onAdded }: { managerId: string; onAdded: () => void }) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid positive number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manager-odds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manager_id: managerId, odds_value: parsed, notes: notes || null }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to save");
      }
      setValue("");
      setNotes("");
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <div className="text-xs text-slate-500 font-mono mb-2">ADD ODDS SNAPSHOT</div>
      <div className="flex gap-2 items-start flex-wrap">
        <div>
          <input
            type="number"
            step="0.25"
            min="0.1"
            placeholder="e.g. 3.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
          <div className="text-xs text-slate-600 font-mono mt-0.5">fractional /1</div>
        </div>
        <input
          type="text"
          placeholder="Note (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 min-w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold rounded transition-colors"
        >
          {loading ? "SAVING…" : "RECORD"}
        </button>
      </div>
      {error && <div className="text-red-400 text-xs font-mono mt-2">{error}</div>}
    </div>
  );
}

function ManagerRow({
  m,
  selected,
  onSelect,
}: {
  m: Manager;
  selected: boolean;
  onSelect: () => void;
}) {
  const sc = STATUS_CONFIG[m.status];
  const pc = PROB_CONFIG[m.probability];
  const latest = m.odds[m.odds.length - 1]?.value;
  const movement = oddsMovement(m.odds);

  return (
    <tr
      onClick={onSelect}
      className={`border-b border-slate-800 cursor-pointer transition-colors duration-150 ${
        selected ? "bg-slate-800/60" : "hover:bg-slate-800/30"
      }`}
    >
      <td className="py-3 pl-4 pr-2">
        <div className="font-semibold text-slate-100 text-sm tracking-tight">{m.name}</div>
        <div className="text-xs text-slate-500 font-mono mt-0.5">{m.club}</div>
      </td>
      <td className="py-3 px-2">
        <span className={`flex items-center gap-1.5 text-xs font-mono font-bold ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
          {sc.label}
        </span>
      </td>
      <td className="py-3 px-2 text-xs font-mono text-slate-400">
        {m.contract_expiry ?? <span className="text-sky-400/70">Interim</span>}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pc.color} ${pc.width}`} />
          </div>
          <span className={`text-xs font-mono ${pc.color}`}>{pc.label}</span>
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <span className="font-mono text-sm font-bold text-slate-200">
          {latest != null ? `${latest}/1` : "—"}
        </span>
        <span
          className={`ml-2 text-xs font-mono ${
            movement === "shortening"
              ? "text-red-400"
              : movement === "drifting"
              ? "text-emerald-400"
              : "text-slate-600"
          }`}
        >
          {movement === "shortening" ? "▼" : movement === "drifting" ? "▲" : "—"}
        </span>
      </td>
      <td className="py-3 px-4">
        {m.odds.length > 0 ? (
          <Sparkline odds={m.odds} />
        ) : (
          <span className="text-slate-700 text-xs font-mono">no data</span>
        )}
      </td>
    </tr>
  );
}

function DetailPanel({ m, onOddsAdded }: { m: Manager; onOddsAdded: () => void }) {
  const sc = STATUS_CONFIG[m.status];
  const movement = oddsMovement(m.odds);

  return (
    <div className="h-full flex flex-col gap-5 p-6 border-l border-slate-800 overflow-y-auto">
      <div>
        <div className={`text-xs font-mono font-bold mb-1 ${sc.color}`}>{sc.label}</div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{m.name}</h2>
        <div className="text-sm text-slate-400 font-mono mt-1">{m.club}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { label: "CONTRACT EXPIRY", value: m.contract_expiry ?? "Interim / None" },
            {
              label: "ODDS TREND",
              value:
                movement === "shortening"
                  ? "↓ Shortening"
                  : movement === "drifting"
                  ? "↑ Drifting"
                  : "→ Flat",
              className:
                movement === "shortening"
                  ? "text-red-400"
                  : movement === "drifting"
                  ? "text-emerald-400"
                  : "text-slate-400",
            },
            { label: "PREDICTED NEXT", value: m.predicted_destination },
            { label: "REPLACEMENT TARGET", value: m.replacement_target },
          ] as Array<{ label: string; value: string; className?: string }>
        ).map(({ label, value, className }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 font-mono mb-1">{label}</div>
            <div className={`text-sm font-medium text-slate-200 ${className ?? ""}`}>{value}</div>
          </div>
        ))}
      </div>

      {m.odds.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 font-mono mb-2">ODDS HISTORY</div>
          <div className="bg-slate-800/50 rounded-lg overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-500">DATE</th>
                  <th className="text-right px-3 py-2 text-slate-500">ODDS</th>
                  <th className="text-left px-3 py-2 text-slate-500">SOURCE</th>
                </tr>
              </thead>
              <tbody>
                {[...m.odds].reverse().map((o, i) => (
                  <tr key={i} className="border-b border-slate-700/50 last:border-0">
                    <td className="px-3 py-2 text-slate-400">{o.date}</td>
                    <td className="px-3 py-2 text-right text-slate-100 font-bold">{o.value}/1</td>
                    <td className="px-3 py-2 text-slate-500">{o.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {m.odds.length > 1 && (
        <div className="flex items-center gap-4">
          <Sparkline odds={m.odds} />
          <div className="text-xs font-mono text-slate-500">
            {m.odds[0]?.value}/1 → {m.odds[m.odds.length - 1]?.value}/1
          </div>
        </div>
      )}

      <AddOddsForm managerId={m.id} onAdded={onOddsAdded} />

      <div>
        <div className="text-xs text-slate-500 font-mono mb-2">ANALYST NOTE</div>
        <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
          {m.notes}
        </p>
      </div>

      <div>
        <div className="flex justify-between text-xs font-mono text-slate-500 mb-1.5">
          <span>EXIT PROBABILITY</span>
          <span className={PROB_CONFIG[m.probability].color}>{PROB_CONFIG[m.probability].label}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${PROB_CONFIG[m.probability].color} ${PROB_CONFIG[m.probability].width}`}
          />
        </div>
      </div>

      <div className="mt-auto text-xs text-slate-600 font-mono border-t border-slate-800 pt-3">
        SOURCE: Football365 analysis 03 Apr 2026 · For research only · Not a betting recommendation
      </div>
    </div>
  );
}

export default function ManagerMarketPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "ALL">("ALL");

  const fetchManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/manager-odds");
      if (!res.ok) throw new Error("Failed to fetch managers");
      const data: Manager[] = await res.json();
      setManagers(data);
      if (!selected && data.length > 0) setSelected(data[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const filtered = filter === "ALL" ? managers : managers.filter((m) => m.status === filter);
  const selectedManager = managers.find((m) => m.id === selected);

  const filterOptions: Array<{ value: Status | "ALL"; label: string }> = [
    { value: "ALL",     label: "All" },
    { value: "AT_RISK", label: "At Risk" },
    { value: "LEAVING", label: "Leaving" },
    { value: "INTERIM", label: "Interim" },
    { value: "STABLE",  label: "Stable" },
  ];

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}
    >
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Dashboard
          </a>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-400 tracking-widest uppercase">
              Manager Market · PL 2025/26
            </span>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-600">
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="px-6 pt-6 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          PL Manager Exit Tracker
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Structured signals for next manager betting markets — Summer 2026
        </p>
        <div className="flex gap-2 mt-4">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                filter === f.value
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-mono">
          Loading market data…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-400 text-sm font-mono">
          {error}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-950 z-10">
                <tr className="border-b border-slate-800">
                  {["MANAGER", "STATUS", "CONTRACT", "EXIT PROB", "ODDS (LATEST)", "TREND"].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-2 px-2 first:pl-4 text-xs font-mono text-slate-500 tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <ManagerRow
                    key={m.id}
                    m={m}
                    selected={selected === m.id}
                    onSelect={() => setSelected(m.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {selectedManager && (
            <div className="w-80 xl:w-96 flex-shrink-0">
              <DetailPanel m={selectedManager} onOddsAdded={fetchManagers} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
