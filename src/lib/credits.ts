import { CreditTransactionType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CreditTransactionInput = {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  referenceId?: string;
  tx?: Prisma.TransactionClient;
};

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

export async function applyCreditTransaction({
  userId,
  amount,
  type,
  referenceId,
  tx
}: CreditTransactionInput): Promise<void> {
  const db = tx ?? prisma;

  if (amount < 0) {
    const updated = await db.user.updateMany({
      where: {
        id: userId,
        creditBalance: {
          gte: Math.abs(amount)
        }
      },
      data: {
        creditBalance: {
          increment: amount
        }
      }
    });

    if (updated.count === 0) {
      throw new InsufficientCreditsError();
    }
  } else if (amount > 0) {
    await db.user.update({
      where: { id: userId },
      data: {
        creditBalance: {
          increment: amount
        }
      }
    });
  }

  await db.creditTransaction.create({
    data: {
      userId,
      amount,
      type,
      referenceId
    }
  });
}
