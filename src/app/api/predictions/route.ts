import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fixtureId,
      matchId,
      homeTeam,
      awayTeam,
      league,
      market,
      selection,
      modelProbability,
      impliedProbability,
      externalProbability,
      edge,
      oddsTaken,
      stake = 1,
      kickoffAt,
    } = body;

    if (!matchId || !market || !selection || !oddsTaken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prediction = await prisma.prediction.create({
      data: {
        fixtureId,
        matchId,
        homeTeam,
        awayTeam,
        league,
        market,
        selection,
        modelProbability,
        impliedProbability,
        externalProbability,
        edge,
        oddsTaken,
        stake,
        kickoffAt: kickoffAt ? new Date(kickoffAt) : null,
        placedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Prediction creation error:", error);
    return NextResponse.json(
      { error: "Failed to create prediction" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const predictions = await prisma.prediction.findMany({
      where: {
        result: null,
      },
      orderBy: {
        edge: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      predictions,
      count: predictions.length,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
