import {
  CreditTransactionType,
  Prisma,
  RecruiterVerificationStatus
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  domainLikelyMatchesCompany,
  getDomainFromEmail,
  normalizeCompanyName,
  sanitizeDomain
} from "@/lib/company";
import { applyCreditTransaction } from "@/lib/credits";
import { verifyRecruiterEmail } from "@/lib/emailVerification";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  companyName: z.string().min(2).max(120),
  companyDomain: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email(),
  recruiterName: z.string().min(2).max(120),
  title: z.string().max(120).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal(""))
});

function dedupeDomains(domains: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const domain of domains) {
    const normalized = sanitizeDomain(domain);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

async function getKnownDomainsForCompany(companyId: string, primaryDomain: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ domain: string | null }>>`
    SELECT DISTINCT split_part("email", '@', 2) AS domain
    FROM "RecruiterEmail"
    WHERE "companyId" = ${companyId}
    LIMIT 100
  `;

  return dedupeDomains([primaryDomain, ...rows.map((row) => row.domain ?? "")]);
}

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
  const sanitizedDomain = sanitizeDomain(parsed.data.companyDomain ?? "");
  const emailDomain = sanitizeDomain(getDomainFromEmail(normalizedEmail));

  const existingCompany = await prisma.company.findUnique({
    where: { normalizedName: normalizedCompanyName },
    select: {
      id: true,
      domain: true
    }
  });

  const derivedDomainForNewCompany = sanitizedDomain || emailDomain;
  if (!existingCompany && derivedDomainForNewCompany.length < 3) {
    return NextResponse.json(
      { error: "Provide a valid company domain or a valid work email domain." },
      { status: 400 }
    );
  }

  const verificationDomain = existingCompany?.domain ?? derivedDomainForNewCompany;

  let knownDomains = existingCompany
    ? await getKnownDomainsForCompany(existingCompany.id, existingCompany.domain)
    : [verificationDomain];

  // Keep subdomain/parent-domain entries usable without trusting unrelated user input.
  if (
    existingCompany &&
    sanitizedDomain &&
    domainLikelyMatchesCompany(sanitizedDomain, existingCompany.domain)
  ) {
    knownDomains = dedupeDomains([...knownDomains, sanitizedDomain]);
  }

  const verification = await verifyRecruiterEmail({
    email: normalizedEmail,
    companyDomain: verificationDomain,
    knownDomains
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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const company =
        existingCompany ??
        (await tx.company.upsert({
          where: {
            normalizedName: normalizedCompanyName
          },
          update: {
            name: parsed.data.companyName.trim()
          },
          create: {
            name: parsed.data.companyName.trim(),
            normalizedName: normalizedCompanyName,
            domain: derivedDomainForNewCompany,
            aliases: []
          }
        }));

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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This recruiter email is already in the database." },
        { status: 409 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to submit recruiter email", {
        email: normalizedEmail,
        domain: emailDomain,
        error
      });
    }

    return NextResponse.json(
      { error: "Submission failed. Please try again." },
      { status: 500 }
    );
  }
}
