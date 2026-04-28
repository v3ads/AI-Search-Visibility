/**
 * Stripe billing service
 */
import Stripe from "stripe";
import { PLAN_LIMITS } from "@shared/schema";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Stripe Price IDs — created via setup_stripe.py on 2026-04-28
export const STRIPE_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  starter: {
    monthly: "price_1TRCOIBN7gC36D1gqENKjmN9",
    yearly:  "price_1TRCOJBN7gC36D1g6BaX5P7p",
  },
  growth: {
    monthly: "price_1TRCOJBN7gC36D1gx101Byq6",
    yearly:  "price_1TRCOKBN7gC36D1gd3fr6LmK",
  },
  agency: {
    monthly: "price_1TRCOLBN7gC36D1gjZNcrhRS",
    yearly:  "price_1TRCOLBN7gC36D1gv4N25LuS",
  },
};

export const PLAN_PRICING = {
  free:    { monthly: 0,   yearly: 0 },
  starter: { monthly: 49,  yearly: 470 },
  growth:  { monthly: 149, yearly: 1430 },
  agency:  { monthly: 399, yearly: 3830 },
};

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}

export async function createCheckoutSession(
  orgId: string,
  plan: string,
  billing: "monthly" | "yearly",
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const planPrices = STRIPE_PRICE_IDS[plan];
  if (!planPrices) throw new Error(`No price IDs configured for plan: ${plan}`);
  const priceId = planPrices[billing];

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId, plan, billing },
    subscription_data: {
      metadata: { orgId, plan, billing },
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
