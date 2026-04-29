/**
 * Single source of truth for all Stripe configuration.
 * Import from here — never hardcode price IDs elsewhere.
 */

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

export const APP_URL =
  process.env.APP_URL
    ? (process.env.APP_URL.startsWith("http") ? process.env.APP_URL : `https://${process.env.APP_URL}`)
    : "https://plumboost.com";
