/**
 * Portfolio Allocation Endpoint
 * POST /api/portfolio/allocate
 * Calculate capital allocation across strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateAllocation, rebalanceAllocation, generateAllocationReport, findUnderfundedStrategies } from "@/lib/allocation/allocationEngine";
import { Strategy } from "@/lib/engine/strategy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategies = [], total_capital = 10000, current_allocation } = body;

    if (!Array.isArray(strategies) || strategies.length === 0) {
      return NextResponse.json(
        { error: "Provide array of strategies" },
        { status: 400 }
      );
    }

    // Calculate new allocation
    const allocation = calculateAllocation(strategies as Strategy[], total_capital);

    // Generate report
    const report = generateAllocationReport(allocation);

    // Find underfunded strategies
    const underfunded = findUnderfundedStrategies(strategies as Strategy[], allocation);

    let rebalanceInfo: any = null;
    if (current_allocation) {
      rebalanceInfo = rebalanceAllocation(current_allocation, allocation);
    }

    return NextResponse.json({
      success: true,
      allocation,
      report,
      underfunded_strategies: underfunded.map((s) => s.id),
      rebalance: rebalanceInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Allocation error:", error);
    return NextResponse.json(
      { error: "Allocation calculation failed" },
      { status: 500 }
    );
  }
}
