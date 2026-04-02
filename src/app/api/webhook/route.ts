import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return Response.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.customer_email) {
        // Update user to Pro
        const { error } = await supabase
          .from('users')
          .update({ 
            isPro: true,
            stripeId: session.customer,
            stripeSubscriptionId: session.subscription,
          })
          .eq('email', session.customer_email)

        if (error) {
          console.error('Failed to update user:', error)
        }
      }
    }

    // Handle customer.subscription.deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription

      if (subscription.customer) {
        // Get customer to find email
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        )

        if ('email' in customer && customer.email) {
          // Downgrade user from Pro
          const { error } = await supabase
            .from('users')
            .update({ isPro: false })
            .eq('email', customer.email)

          if (error) {
            console.error('Failed to downgrade user:', error)
          }
        }
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
