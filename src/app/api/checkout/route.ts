import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

export async function POST(req: Request) {
  try {
    // Get user email from request or session
    const { email } = await req.json()

    if (!email) {
      return Response.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_placeholder',
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
