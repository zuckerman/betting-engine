import { NextResponse } from "next/server";

/**
 * GET /api/football/performance
 * 
 * Calculate prediction accuracy, ROI, and performance metrics
 */
export async function GET() {
  try {
    // Performance tracking disabled for now (Prisma DB)
    // TODO: Connect to actual database for tracking
    
    return NextResponse.json({
      status: "mock",
      message: "Feature coming soon: connected to actual database",
      total_matches: 0,
      accuracy: 0,
      roi: 0,
    });
  } catch (error: any) {
    console.error("Performance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate performance" },
      { status: 500 }
    );
  }
}
