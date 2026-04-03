import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message: "Checkout disabled during validation phase",
      reason: "Payments disabled until edge is validated (Day 14+)",
    },
    { status: 503 }
  );
}
