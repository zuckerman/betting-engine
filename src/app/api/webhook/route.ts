/**
 * /api/webhook
 * 
 * Stripe webhook handler - temporarily disabled
 * Will be re-enabled when Stripe checkout is re-enabled (Day 14+)
 */

export async function POST() {
  return Response.json({
    message: 'Webhook disabled during validation phase',
    status: 'coming after Day 14',
  })
}

