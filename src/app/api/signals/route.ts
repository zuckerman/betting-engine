import { NextResponse } from "next/server";

export async function GET() {
  // Mock signals - in production this would pull from your prediction model
  const signals = [
    {
      id: "1",
      matchId: "12345",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      market: "over_2.5",
      selection: "over",
      oddsTaken: 1.95,
      closingOdds: 1.92,
      edge: 0.142,
      confidence: "HIGH",
      stake: 180,
      timestamp: Date.now(),
    },
    {
      id: "2",
      matchId: "12346",
      homeTeam: "Manchester City",
      awayTeam: "Liverpool",
      market: "btts",
      selection: "yes",
      oddsTaken: 1.85,
      closingOdds: 1.82,
      edge: 0.071,
      confidence: "MEDIUM",
      stake: 150,
      timestamp: Date.now(),
    },
    {
      id: "3",
      matchId: "12347",
      homeTeam: "Tottenham",
      awayTeam: "Brighton",
      market: "match_winner",
      selection: "home",
      oddsTaken: 1.58,
      closingOdds: 1.62,
      edge: 0.081,
      confidence: "MEDIUM",
      stake: 120,
      timestamp: Date.now(),
    },
  ];

  // TODO: Check user auth and tier from session/headers
  // For now, return free limit
  // const isPro = user?.isPro || false;
  // if (!isPro) {
  //   return NextResponse.json(signals.slice(0, FREE_LIMIT));
  // }
  // For now, return all signals (public)
  // const isPro = user?.tier === "pro";
  // if (!isPro) {
  //   return NextResponse.json(signals.slice(0, 2));
  // }

  return NextResponse.json(signals);
}
