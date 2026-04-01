"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"

export default function Monitor() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [experimentId, setExperimentId] = useState("")

  useEffect(() => {
    // Get experimentId from localStorage or URL
    const stored = localStorage.getItem("activeExperimentId")
    if (stored) {
      setExperimentId(stored)
      fetchData(stored)
    }
  }, [])

  const fetchData = async (expId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard?experimentId=${expId}`)
      const json = await response.json()
      setData(json)
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: "monospace", textAlign: "center" }}>
        <div>Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 20, fontFamily: "monospace" }}>
        <div>No experiment selected</div>
      </div>
    )
  }

  const m = data.metrics

  return (
    <div style={{ padding: 20, fontFamily: "monospace", backgroundColor: "#0a0e27", color: "#e4e4e7", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 10px 0" }}>📊 Betting Engine Monitor</h1>
        <div style={{ fontSize: 12, color: "#a1a1a6" }}>
          {data.experiment?.name} • {data.experiment?.competition}
        </div>
      </div>

      {/* TOP METRICS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 15,
        marginBottom: 40
      }}>
        <MetricCard label="AVG CLV" value={(m.avgClv * 100).toFixed(2) + "%"} trend={m.clvTrend} />
        <MetricCard label="POSITIVE %" value={m.positiveClvRate.toFixed(1) + "%"} trend={m.positiveClvRate > 50 ? "up" : "down"} />
        <MetricCard label="TOTAL BETS" value={m.totalBets} trend="neutral" />
        <MetricCard label="DRAWDOWN" value={m.drawdown.toFixed(1) + "%"} trend={m.drawdown < 10 ? "up" : "down"} />
        <MetricCard label="BALANCE" value={"£" + m.currentBalance.toFixed(0)} trend={m.currentBalance > m.startingBalance ? "up" : "down"} />
        <MetricCard label="PEAK" value={"£" + m.peakBalance.toFixed(0)} trend="neutral" />
      </div>

      <hr style={{ borderColor: "#27272a", marginBottom: 40 }} />

      {/* BALANCE CHART */}
      <div style={{ marginBottom: 50 }}>
        <h2 style={{ fontSize: 14, marginBottom: 20, color: "#fbbf24" }}>💰 BALANCE CURVE</h2>
        <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a" }}>
          {data.balanceHistory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.balanceHistory} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1a6" style={{ fontSize: 12 }} />
                <YAxis stroke="#a1a1a6" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b", borderRadius: 4 }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a" }}>
              No balance history yet
            </div>
          )}
        </div>
      </div>

      {/* CLV CHART */}
      <div style={{ marginBottom: 50 }}>
        <h2 style={{ fontSize: 14, marginBottom: 20, color: "#fbbf24" }}>📈 CLV TREND</h2>
        <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a" }}>
          {data.clvHistory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.clvHistory} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1a6" style={{ fontSize: 12 }} />
                <YAxis stroke="#a1a1a6" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b", borderRadius: 4 }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Bar
                  dataKey="clv"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a" }}>
              No CLV history yet
            </div>
          )}
        </div>
      </div>

      {/* REAL VS SHADOW */}
      <div style={{ marginBottom: 50 }}>
        <h2 style={{ fontSize: 14, marginBottom: 20, color: "#fbbf24" }}>🧠 REAL VS SHADOW</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
          <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a" }}>
            <div style={{ fontSize: 12, color: "#a1a1a6", marginBottom: 8 }}>REAL BETS</div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981", marginBottom: 8 }}>
              {m.realBets}
            </div>
            <div style={{ fontSize: 12, color: "#a1a1a6" }}>
              CLV: {(m.realVsShadow.realClv * 100).toFixed(2)}%
            </div>
          </div>

          <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a" }}>
            <div style={{ fontSize: 12, color: "#a1a1a6", marginBottom: 8 }}>SHADOW BETS</div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#8b5cf6", marginBottom: 8 }}>
              {m.shadowBets}
            </div>
            <div style={{ fontSize: 12, color: "#a1a1a6" }}>
              CLV: {(m.realVsShadow.shadowClv * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* COMPARISON */}
        <div style={{ marginTop: 20, padding: 15, backgroundColor: "#18181b", borderRadius: 8, border: "1px solid #27272a" }}>
          <div style={{ fontSize: 12, color: "#a1a1a6", marginBottom: 8 }}>FILTER QUALITY</div>
          <div style={{ fontSize: 14 }}>
            {m.realVsShadow.realClv > m.realVsShadow.shadowClv ? (
              <span style={{ color: "#10b981" }}>✅ Real CLV > Shadow CLV (filter working)</span>
            ) : m.realVsShadow.realClv < m.realVsShadow.shadowClv ? (
              <span style={{ color: "#ef4444" }}>❌ Shadow CLV > Real CLV (filter broken)</span>
            ) : (
              <span style={{ color: "#f59e0b" }}>⚠️ Equal CLV (no edge)</span>
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM STATUS */}
      <div style={{ marginBottom: 50 }}>
        <h2 style={{ fontSize: 14, marginBottom: 20, color: "#fbbf24" }}>🔔 SYSTEM STATUS</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
          <StatusCheck
            label="Edge Present"
            status={m.avgClv > 0}
            value={`${(m.avgClv * 100).toFixed(2)}%`}
          />
          <StatusCheck
            label="Hit Rate"
            status={m.positiveClvRate > 50}
            value={`${m.positiveClvRate.toFixed(1)}%`}
          />
          <StatusCheck
            label="Drawdown Safe"
            status={m.drawdown < 10}
            value={`${m.drawdown.toFixed(1)}%`}
          />
          <StatusCheck
            label="Sample Size"
            status={m.totalBets >= 30}
            value={`${m.totalBets} bets`}
          />
        </div>
      </div>

      {/* RAW METRICS */}
      <div style={{ marginBottom: 50 }}>
        <h2 style={{ fontSize: 14, marginBottom: 20, color: "#fbbf24" }}>📋 DETAILED METRICS</h2>
        <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a", fontSize: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <MetricRow label="Total Bets" value={m.totalBets} />
              <MetricRow label="Settled Bets" value={m.settledBets} />
              <MetricRow label="Avg CLV" value={(m.avgClv * 100).toFixed(2) + "%"} />
              <MetricRow label="Max CLV" value={(m.maxClv * 100).toFixed(2) + "%"} />
              <MetricRow label="Min CLV" value={(m.minClv * 100).toFixed(2) + "%"} />
              <MetricRow label="Positive Rate" value={m.positiveClvRate.toFixed(1) + "%"} />
              <MetricRow label="Current Balance" value={"£" + m.currentBalance.toFixed(2)} />
              <MetricRow label="Peak Balance" value={"£" + m.peakBalance.toFixed(2)} />
              <MetricRow label="Starting Balance" value={"£" + m.startingBalance.toFixed(2)} />
              <MetricRow label="Drawdown" value={m.drawdown.toFixed(1) + "%"} />
              <MetricRow label="Real Bets" value={m.realBets} />
              <MetricRow label="Shadow Bets" value={m.shadowBets} />
            </tbody>
          </table>
        </div>
      </div>

      {/* DECISION GUIDE */}
      <div style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 8, border: "1px solid #27272a", fontSize: 12, lineHeight: 1.6 }}>
        <h3 style={{ fontSize: 14, color: "#fbbf24", marginBottom: 15 }}>📖 HOW TO READ THIS</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ color: "#10b981", marginBottom: 8 }}>✅ GOOD (do nothing)</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#a1a1a6" }}>
              <li>avg_clv &gt; 0</li>
              <li>positive_rate &gt; 50%</li>
              <li>real &gt; shadow</li>
              <li>drawdown &lt; 10%</li>
            </ul>
          </div>
          <div>
            <div style={{ color: "#f59e0b", marginBottom: 8 }}>⚠️ WARNING (watch)</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#a1a1a6" }}>
              <li>avg_clv ~ 0</li>
              <li>positive_rate ~ 48-52%</li>
              <li>Could be noise</li>
              <li>Wait for more data</li>
            </ul>
          </div>
          <div>
            <div style={{ color: "#ef4444", marginBottom: 8 }}>🚨 STOP (auto-halted)</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#a1a1a6" }}>
              <li>avg_clv &lt; 0</li>
              <li>shadow &gt; real</li>
              <li>drawdown &gt; 30%</li>
              <li>System halts bets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, trend }: any) {
  let trendColor = "#a1a1a6"
  if (trend === "up") trendColor = "#10b981"
  if (trend === "down") trendColor = "#ef4444"

  return (
    <div style={{
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      borderRadius: 8,
      padding: 15
    }}>
      <div style={{ fontSize: 10, color: "#71717a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: trendColor }}>
        {value}
      </div>
    </div>
  )
}

function StatusCheck({ label, status, value }: any) {
  return (
    <div style={{
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      borderRadius: 8,
      padding: 15
    }}>
      <div style={{ fontSize: 12, color: "#a1a1a6", marginBottom: 8 }}>
        {status ? "✅" : "⚠️"} {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: "bold", color: status ? "#10b981" : "#f59e0b" }}>
        {value}
      </div>
    </div>
  )
}

function MetricRow({ label, value }: any) {
  return (
    <tr style={{ borderBottom: "1px solid #27272a" }}>
      <td style={{ padding: 10, color: "#a1a1a6" }}>{label}</td>
      <td style={{ padding: 10, color: "#e4e4e7", fontWeight: "bold", textAlign: "right" }}>{value}</td>
    </tr>
  )
}
