/**
 * Execution Mode Control Endpoint
 * POST /api/control/mode - Set execution mode (MANUAL, SEMI_AUTO, FULL_AUTO)
 * GET /api/control/mode - Get current execution mode
 */

import { NextRequest, NextResponse } from "next/server";

let currentMode: "MANUAL" | "SEMI_AUTO" | "FULL_AUTO" = "MANUAL";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (!["MANUAL", "SEMI_AUTO", "FULL_AUTO"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be MANUAL, SEMI_AUTO, or FULL_AUTO" },
        { status: 400 }
      );
    }

    currentMode = mode;

    return NextResponse.json({
      success: true,
      mode: currentMode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mode control error:", error);
    return NextResponse.json(
      { error: "Failed to set execution mode" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    mode: currentMode,
    timestamp: new Date().toISOString(),
  });
}
