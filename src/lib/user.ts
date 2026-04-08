import { CreditTransactionType } from "@prisma/client";

import { applyCreditTransaction } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export function getUniversityFromEduEmail(email: string): string | null {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith(".edu")) {
    return null;
  }

  const [, domain = ""] = cleanEmail.split("@");
  if (!domain) {
    return null;
  }

  return domain;
}

export function toAnonymousHandle(userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(0, 4);
  return `@student_${suffix}`;
}

export async function bootstrapUserProfile(userId: string, email: string): Promise<void> {
  const university = getUniversityFromEduEmail(email);

  await prisma.user.update({
    where: { id: userId },
    data: {
      university: university ?? undefined,
      displayName: toAnonymousHandle(userId)
    }
  });

  const signupBonusExists = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      type: CreditTransactionType.SIGNUP_BONUS
    },
    select: { id: true }
  });

  if (!signupBonusExists) {
    await applyCreditTransaction({
      userId,
      amount: 1,
      type: CreditTransactionType.SIGNUP_BONUS
    });
  }
}
