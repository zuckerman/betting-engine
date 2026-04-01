"use client"

import { useEffect, useState } from "react"

export default function Monitor() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [experimentId, setExperimentId] = useState<string | null>(null)

  useEffect(() => {
    // Get experimentId from localStorage
    const stored = localStorage.getItem("activeExperimentId")
    if (stored) {
      setExperimentId(stored)
      fetchData(stored)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchData = async (expId: string) => {
    try {
      const response = await fetch(`/api/dashboard?experimentId=${expId}`)
      const json = await response.json()
      setData(json)
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatus = () => {
    if (!data || !data.metrics) {
      return { label: "LOADING", color: "#9ca3af", icon: "⏳" }
    }

    const m = data.metrics
    const clvOk = m.avgClv > 0
    const hitRateOk = m.positiveClvRate > 50

    if (!clvOk || !hitRateOk) {
      return { label: "STOP", color: "#ef4444", icon: "🔴" }
    }

    if (m.drawdown > 10) {
      return { label: "WARNING", color: "#f59e0b", icon: "🟡" }
    }

    return { label: "RUNNING", color: "#10b981", icon: "🟢" }
  }

  const status = getStatus()

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Arial, sans-serif",
      textAlign: "center",
      backgroundColor: "#0f172a",
      color: "#e2e8f0"
    }}>
      {loading ? (
        <div>Loading...</div>
      ) : !experimentId ? (
        <div>
          <p>No active experiment</p>
          <p style={{ fontSize: 12, opacity: 0.5 }}>Set activeExperimentId in localStorage</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 120, marginBottom: 20 }}>
            {status.icon}
          </div>

          <div style={{
            fontSize: 48,
            fontWeight: "bold",
            color: status.color,
            marginBottom: 30,
            letterSpacing: 2
          }}>
            {status.label}
          </div>

          {data?.metrics && (
            <div style={{
              marginTop: 20,
              fontSize: 14,
              opacity: 0.7,
              lineHeight: 1.8
            }}>
              <div>CLV: {(data.metrics.avgClv * 100).toFixed(2)}%</div>
              <div>Hit Rate: {data.metrics.positiveClvRate.toFixed(1)}%</div>
              <div>Drawdown: {data.metrics.drawdown.toFixed(1)}%</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.5 }}>
                Total Bets: {data.metrics.totalBets}
              </div>
            </div>
          )}

          <div style={{
            marginTop: 40,
            fontSize: 12,
            opacity: 0.4
          }}>
            {data?.experiment?.name}
          </div>
        </>
      )}
    </div>
  )
}
