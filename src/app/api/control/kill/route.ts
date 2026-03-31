/**
 * Kill Switch Control Endpoint
 * POST /api/control/kill - Activate/deactivate kill switch
 * GET /api/control/kill - Check kill switch status
 */

import { NextRequest, NextResponse } from "next/server";
import { setKillSwitch, isKillSwitchActive } from "@/lib/execution/autoExecute";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { active } = body;

    setKillSwitch(active === true);

    return NextResponse.json({
      success: true,
      killSwitch: isKillSwitchActive(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Kill switch control error:", error);
    return NextResponse.json(
      { error: "Failed to control kill switch" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    killSwitch: isKillSwitchActive(),
    timestamp: new Date().toISOString(),
  });
}
