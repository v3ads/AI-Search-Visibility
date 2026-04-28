/**
 * Stripe billing service
 */
import Stripe from "stripe";
import { PLAN_LIMITS } from "@shared/schema";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Stripe Price IDs — set these as env vars after creating products in Stripe dashboard
export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || "",
  growth:  process.env.STRIPE_PRICE_GROWTH  || "",
  agency:  process.env.STRIPE_PRICE_AGENCY  || "",
};

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}

export async function createCheckoutSession(
  orgId: string,
  plan: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) throw new Error(`No price ID configured for plan: ${plan}`);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId, plan },
    subscription_data: {
      metadata: { orgId, plan },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
}

export async function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
