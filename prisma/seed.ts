import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding predictions table...");

  const now = new Date();

  // Create 50 sample predictions with realistic data
  for (let i = 0; i < 50; i++) {
    const odds = 1.8 + Math.random() * 0.6;
    const resultRand = Math.random();

    let result: "WIN" | "LOSS" | null = null;
    if (resultRand > 0.45) result = "WIN";
    else if (resultRand > 0.05) result = "LOSS";

    await prisma.prediction.create({
      data: {
        fixtureId: `fixture_${i}`,
        matchId: `match_${i}`,
        homeTeam: ["Arsenal", "Chelsea", "Liverpool", "City"][i % 4],
        awayTeam: ["Spurs", "United", "Brighton", "Newcastle"][i % 4],
        league: 39,

        market: i % 3 === 0 ? "over_2.5" : i % 3 === 1 ? "btts" : "match_winner",
        selection: i % 3 === 0 ? "over" : i % 3 === 1 ? "yes" : "home",

        modelProbability: 0.58 + Math.random() * 0.1,
        impliedProbability: 1 / odds,
        externalProbability: 0.57 + Math.random() * 0.08,
        edge: 0.08 + Math.random() * 0.04,

        oddsTaken: odds,
        closingOdds: odds + (Math.random() - 0.5) * 0.1,

        stake: 1,

        result,
        placedAt: new Date(now.getTime() - i * 86400000),
        kickoffAt: new Date(now.getTime() - (i - 0.5) * 86400000),
        settledAt: result ? new Date(now.getTime() - (i - 2) * 86400000) : null,
      },
    });
  }

  console.log("✅ Seeded 50 predictions");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
