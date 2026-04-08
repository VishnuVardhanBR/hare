import { CreditTransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isCreditPurchasesEnabled } from "@/lib/featureFlags";
import { CREDIT_TIERS, stripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  tier: z.enum(["10", "25", "50"])
});

export async function POST(request: Request) {
  if (!isCreditPurchasesEnabled()) {
    return NextResponse.json(
      {
        error: "Credit purchases are disabled. Submit a valid recruiter email to earn credits."
      },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tier = CREDIT_TIERS[parsed.data.tier];
  const priceId = process.env[tier.priceEnvVar];

  if (!priceId) {
    return NextResponse.json(
      { error: `Missing ${tier.priceEnvVar} environment variable.` },
      { status: 500 }
    );
  }

  const { origin } = new URL(request.url);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${origin}/dashboard?purchase=success`,
    cancel_url: `${origin}/dashboard?purchase=cancelled`,
    customer_email: session.user.email ?? undefined,
    metadata: {
      userId: session.user.id,
      credits: String(tier.credits),
      transactionType: CreditTransactionType.PURCHASE
    }
  });

  return NextResponse.json({ url: checkoutSession.url });
}
