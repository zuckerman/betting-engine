import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all predictions and filter in-memory (workaround for optional enum)
    const allPredictions = await prisma.prediction.findMany();
    const settled = allPredictions.filter((p) => p.result !== null);

    if (settled.length === 0) {
      return NextResponse.json({
        roi: 0,
        profit: 0,
        bets: 0,
        clv: 0,
        hitRate: 0,
        totalStake: 0,
      });
    }

    let profit = 0;
    let wins = 0;
    let losses = 0;
    const clvArr: number[] = [];
    let totalStake = 0;

    for (const p of settled) {
      totalStake += p.stake;

      if (p.result === "WIN") {
        profit += (p.oddsTaken - 1) * p.stake;
        wins++;
      } else if (p.result === "LOSS") {
        profit -= p.stake;
        losses++;
      }

      if (p.closingOdds) {
        const clv = (p.closingOdds - p.oddsTaken) / p.oddsTaken;
        clvArr.push(clv);
      }
    }

    const roi = totalStake > 0 ? profit / totalStake : 0;
    const hitRate = wins / (wins + losses || 1);
    const avgClv =
      clvArr.length > 0 ? clvArr.reduce((a, b) => a + b, 0) / clvArr.length : 0;

    return NextResponse.json({
      roi,
      profit,
      bets: settled.length,
      clv: avgClv,
      hitRate,
      totalStake,
      wins,
      losses,
    });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
