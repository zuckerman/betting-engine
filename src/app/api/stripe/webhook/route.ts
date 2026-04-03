import { NextResponse } from "next/server";

/**
 * Stripe webhook disabled during validation phase
 * Will be re-enabled after CLV proof (Day 14+)
 */
export async function POST() {
  return NextResponse.json(
    {
      message: "Webhook disabled during validation phase",
      reason: "Stripe disabled until edge validation complete",
    },
    { status: 503 }
  );
}
