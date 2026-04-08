import { CreditTransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { applyCreditTransaction, InsufficientCreditsError } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

const unlockSchema = z.object({
  emailId: z.string().uuid()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const recruiterEmail = await prisma.recruiterEmail.findUnique({
    where: { id: parsed.data.emailId },
    select: { id: true }
  });

  if (!recruiterEmail) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const emailId = parsed.data.emailId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUnlock = await tx.unlock.findUnique({
        where: {
          userId_emailId: { userId, emailId }
        },
        select: { id: true }
      });

      if (existingUnlock) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true }
        });

        return {
          alreadyUnlocked: true,
          creditBalance: user?.creditBalance ?? 0
        };
      }

      await applyCreditTransaction({
        userId,
        amount: -1,
        type: CreditTransactionType.UNLOCK,
        referenceId: emailId,
        tx
      });

      await tx.unlock.create({
        data: { userId, emailId }
      });

      const [user, recruiter] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true }
        }),
        tx.recruiterEmail.findUnique({
          where: { id: emailId },
          include: {
            submittedBy: { select: { displayName: true } }
          }
        })
      ]);

      return {
        alreadyUnlocked: false,
        creditBalance: user?.creditBalance ?? 0,
        recruiterName: recruiter?.recruiterName ?? null,
        email: recruiter?.email ?? null,
        submittedBy: recruiter?.submittedBy.displayName ?? null,
        verificationNote: recruiter?.verificationNote ?? null,
        lastVerifiedAt: recruiter?.lastVerifiedAt?.toISOString() ?? null
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    throw error;
  }
}
