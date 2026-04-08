import Stripe from "stripe";

export const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

export const CREDIT_TIERS = {
  "10": {
    credits: 10,
    priceEnvVar: "STRIPE_PRICE_10"
  },
  "25": {
    credits: 25,
    priceEnvVar: "STRIPE_PRICE_25"
  },
  "50": {
    credits: 50,
    priceEnvVar: "STRIPE_PRICE_50"
  }
} as const;
