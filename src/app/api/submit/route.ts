import { CreditTransactionType, RecruiterVerificationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { normalizeCompanyName, sanitizeDomain } from "@/lib/company";
import { applyCreditTransaction } from "@/lib/credits";
import { verifyRecruiterEmail } from "@/lib/emailVerification";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  companyName: z.string().min(2).max(120),
  companyDomain: z.string().min(3).max(120),
  email: z.string().email(),
  recruiterName: z.string().min(2).max(120),
  title: z.string().max(120).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const duplicate = await prisma.recruiterEmail.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "This recruiter email is already in the database." },
      { status: 409 }
    );
  }

  const normalizedCompanyName = normalizeCompanyName(parsed.data.companyName);
  const sanitizedDomain = sanitizeDomain(parsed.data.companyDomain);

  let company = await prisma.company.findUnique({
    where: { normalizedName: normalizedCompanyName }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: parsed.data.companyName.trim(),
        normalizedName: normalizedCompanyName,
        domain: sanitizedDomain,
        aliases: []
      }
    });
  }

  const verification = await verifyRecruiterEmail({
    email: normalizedEmail,
    companyDomain: company.domain,
    knownDomains: [sanitizedDomain, company.domain]
  });

  if (verification.status === "failed") {
    return NextResponse.json(
      {
        error: verification.note
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.recruiterEmail.create({
      data: {
        companyId: company.id,
        email: normalizedEmail,
        recruiterName: parsed.data.recruiterName.trim(),
        title: parsed.data.title?.trim() || null,
        department: parsed.data.department?.trim() || null,
        submittedById: userId,
        verificationStatus: RecruiterVerificationStatus.VERIFIED,
        verificationNote: verification.note,
        lastVerifiedAt: verification.lastVerifiedAt
      }
    });

    await applyCreditTransaction({
      userId,
      amount: 5,
      type: CreditTransactionType.SUBMISSION,
      referenceId: entry.id,
      tx
    });

    return entry;
  });

  return NextResponse.json({
    ok: true,
    emailId: created.id,
    verification: verification.note,
    creditsEarned: 5
  });
}
