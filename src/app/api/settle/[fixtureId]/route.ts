/**
 * POST /api/settle/{fixtureId}
 * 
 * DEPRECATED: Use /api/result/settle instead
 * This endpoint is kept for backwards compatibility
 * 
 * New settlement flow uses fixture_id in request body:
 * POST /api/result/settle { "fixture_id": 12345 }
 */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params
  
  return Response.json(
    {
      error: "This endpoint is deprecated",
      message: "Use POST /api/result/settle instead",
      example: { fixture_id: parseInt(fixtureId) },
    },
    { status: 410 }
  )
}

