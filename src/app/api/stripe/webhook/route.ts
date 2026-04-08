import { CreditTransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { applyCreditTransaction } from "@/lib/credits";
import { isCreditPurchasesEnabled } from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isCreditPurchasesEnabled()) {
    return NextResponse.json({ received: true, purchasesEnabled: false });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits ?? "0");

    if (userId && Number.isFinite(credits) && credits > 0) {
      const referenceId = `stripe:${session.id}`;
      const existing = await prisma.creditTransaction.findFirst({
        where: {
          referenceId,
          type: CreditTransactionType.PURCHASE
        },
        select: { id: true }
      });

      if (!existing) {
        await applyCreditTransaction({
          userId,
          amount: credits,
          type: CreditTransactionType.PURCHASE,
          referenceId
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
