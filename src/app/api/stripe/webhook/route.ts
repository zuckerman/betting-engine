import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20",
});

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const buf = await request.arrayBuffer();

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.customer_email) {
        // Update user to pro tier
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from("User")
          .update({
            tier: "pro",
            isPro: true,
            stripeCustomerId: session.customer as string,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("email", session.customer_email);

        if (error) {
          console.error("Failed to update user:", error);
        } else {
          console.log(`✅ Upgraded user ${session.customer_email} to pro`);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const invoices = subscription.latest_invoice
        ? [subscription.latest_invoice]
        : [];

      if (subscription.metadata?.customer_email) {
        // Downgrade user back to free
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from("User")
          .update({
            tier: "free",
            isPro: false,
          })
          .eq("email", subscription.metadata.customer_email);

        if (error) {
          console.error("Failed to downgrade user:", error);
        } else {
          console.log(`⚠️ Downgraded user ${subscription.metadata.customer_email} to free`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
