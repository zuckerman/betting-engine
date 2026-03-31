import { prisma } from "@/lib/prisma";

export interface SystemHealth {
  clv: number;
  roi: number;
  sampleSize: number;
}

export async function checkSystemHealth(): Promise<SystemHealth | null> {
  const recent = await prisma.prediction.findMany({
    where: {
      result: { not: null },
      closingOdds: { not: null },
    },
    orderBy: { settledAt: "desc" },
    take: 50,
  });

  if (recent.length < 20) return null;

  let clv = 0;
  let profit = 0;

  for (const p of recent) {
    if (p.closingOdds) {
      clv += (p.closingOdds - p.oddsTaken) / p.oddsTaken;
    }

    if (p.result === "WIN") profit += (p.oddsTaken - 1) * p.stake;
    else if (p.result === "LOSS") profit -= p.stake;
  }

  const roi = profit / recent.length;
  const avgClv = clv / recent.length;

  return {
    clv: avgClv,
    roi,
    sampleSize: recent.length,
  };
}
