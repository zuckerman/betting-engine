import { NextResponse } from "next/server"
import { MONITOR } from "@/lib/monitor"

/**
 * GET /api/monitor
 * Health check endpoint for monitoring services (e.g., UptimeRobot, Datadog)
 * Returns system status, current metrics, and any active alerts
 */
export async function GET() {
  try {
    const health = await MONITOR.getSystemHealth()

    return NextResponse.json(health, {
      status: health.ok ? 200 : 503,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error,
      },
      { status: 500 }
    )
  }
}
