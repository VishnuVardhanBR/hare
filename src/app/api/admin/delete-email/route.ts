import { CreditTransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/session";

const schema = z.object({
  emailId: z.string().uuid()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const submissionAwards = await tx.creditTransaction.findMany({
      where: {
        referenceId: parsed.data.emailId,
        type: CreditTransactionType.SUBMISSION,
        amount: {
          gt: 0
        }
      },
      select: {
        userId: true,
        amount: true
      }
    });

    const creditsToRevokeByUser = new Map<string, number>();
    for (const award of submissionAwards) {
      creditsToRevokeByUser.set(
        award.userId,
        (creditsToRevokeByUser.get(award.userId) ?? 0) + award.amount
      );
    }

    for (const [userId, creditsToRevoke] of creditsToRevokeByUser) {
      if (creditsToRevoke <= 0) continue;

      await tx.user.update({
        where: {
          id: userId
        },
        data: {
          creditBalance: {
            decrement: creditsToRevoke
          }
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -creditsToRevoke,
          type: CreditTransactionType.REFUND,
          referenceId: `admin-delete:${parsed.data.emailId}`
        }
      });
    }

    await tx.report.deleteMany({ where: { emailId: parsed.data.emailId } });
    await tx.unlock.deleteMany({ where: { emailId: parsed.data.emailId } });
    await tx.recruiterEmail.delete({ where: { id: parsed.data.emailId } });
  });

  return NextResponse.json({ ok: true });
}
