import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all predictions with closingOdds and filter by result in-memory
    const allPredictions = await prisma.prediction.findMany();
    const settled = allPredictions
      .filter((p) => p.result !== null && p.closingOdds !== null)
      .sort((a, b) => {
        const aTime = a.settledAt ? new Date(a.settledAt).getTime() : 0;
        const bTime = b.settledAt ? new Date(b.settledAt).getTime() : 0;
        return aTime - bTime;
      });

    let running = 0;
    let cumulativeClv = 0;

    const series = settled.map((p) => {
      if (p.result === "WIN") {
        running += (p.oddsTaken - 1) * p.stake;
      } else if (p.result === "LOSS") {
        running -= p.stake;
      }

      if (p.closingOdds) {
        const clv = (p.closingOdds - p.oddsTaken) / p.oddsTaken;
        cumulativeClv += clv;
      }

      return {
        date: p.settledAt || new Date(),
        value: running,
        clv: cumulativeClv / (settled.indexOf(p) + 1),
      };
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Timeseries error:", error);
    return NextResponse.json(
      { error: "Failed to compute timeseries" },
      { status: 500 }
    );
  }
}
