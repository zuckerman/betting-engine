/**
 * Execution History Endpoint
 * GET /api/control/executions - Get execution log and stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getExecutionHistory, getExecutionStats } from "@/lib/execution/autoExecute";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const history = getExecutionHistory(limit);
    const stats = getExecutionStats();

    return NextResponse.json({
      success: true,
      history,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Execution history error:", error);
    return NextResponse.json(
      { error: "Failed to get execution history" },
      { status: 500 }
    );
  }
}
