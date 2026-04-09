import {
  CreditTransactionType,
  Prisma,
  RecruiterVerificationStatus
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ALLOWED_BULK_HEADERS,
  REQUIRED_BULK_HEADERS,
  parseCsv
} from "@/app/api/_shared/csv";
import { authOptions } from "@/lib/auth";
import { normalizeCompanyName, sanitizeDomain, getDomainFromEmail, domainLikelyMatchesCompany } from "@/lib/company";
import { applyCreditTransaction } from "@/lib/credits";
import { verifyRecruiterEmail } from "@/lib/emailVerification";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().email();

const MAX_BULK_ROWS = 50;
const BULK_UPLOAD_COOLDOWN_MS = 10 * 60 * 1000;
const BULK_UPLOAD_MARKER_PREFIX = "bulk-upload:";

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

function formatMinutesRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const latestUploadMarker = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      type: CreditTransactionType.SUBMISSION,
      referenceId: {
        startsWith: BULK_UPLOAD_MARKER_PREFIX
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      createdAt: true
    }
  });

  if (latestUploadMarker) {
    const elapsedMs = Date.now() - latestUploadMarker.createdAt.getTime();
    if (elapsedMs < BULK_UPLOAD_COOLDOWN_MS) {
      const remainingMs = BULK_UPLOAD_COOLDOWN_MS - elapsedMs;
      return NextResponse.json(
        {
          error: `Bulk upload cooldown active. Try again in ${formatMinutesRemaining(remainingMs)}.`
        },
        { status: 429 }
      );
    }
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  const csvText = await file.text();
  const { headers, rows } = parseCsv(csvText);

  if (headers.length === 0) {
    return NextResponse.json({ error: "CSV is empty." }, { status: 400 });
  }

  const missingHeaders = REQUIRED_BULK_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required headers: ${missingHeaders.join(", ")}.`
      },
      { status: 400 }
    );
  }

  const invalidHeaders = headers.filter((header) => !ALLOWED_BULK_HEADERS.includes(header as never));
  if (invalidHeaders.length > 0) {
    return NextResponse.json(
      {
        error: `Unexpected headers: ${invalidHeaders.join(", ")}. Allowed headers: ${ALLOWED_BULK_HEADERS.join(", ")}.`
      },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });
  }

  if (rows.length > MAX_BULK_ROWS) {
    return NextResponse.json(
      {
        error: `CSV row limit exceeded. Max ${MAX_BULK_ROWS} rows per upload.`
      },
      { status: 400 }
    );
  }

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: 0,
      type: CreditTransactionType.SUBMISSION,
      referenceId: `${BULK_UPLOAD_MARKER_PREFIX}${Date.now()}`
    }
  });

  let createdCount = 0;
  let skippedDuplicates = 0;
  let skippedInFileDuplicates = 0;
  let invalidRows = 0;
  const rowErrors: string[] = [];

  const seenEmailsInFile = new Set<string>();

  for (const row of rows) {
    const companyName = (row.values.company ?? "").trim();
    const domain = (row.values.domain ?? "").trim();
    const email = (row.values.email ?? "").trim().toLowerCase();
    const recruiterName = (row.values.recruiter_name ?? "").trim();
    const title = (row.values.title ?? "").trim();
    const department = (row.values.department ?? "").trim();

    if (!companyName || !email || !recruiterName) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: missing one or more required fields.`);
      continue;
    }

    if (!emailSchema.safeParse(email).success) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: invalid email "${email}".`);
      continue;
    }

    if (seenEmailsInFile.has(email)) {
      skippedInFileDuplicates += 1;
      rowErrors.push(`Row ${row.rowNumber}: duplicate email in file "${email}" skipped.`);
      continue;
    }
    seenEmailsInFile.add(email);

    const existingEmail = await prisma.recruiterEmail.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingEmail) {
      skippedDuplicates += 1;
      continue;
    }

    const normalizedCompanyName = normalizeCompanyName(companyName);
    if (!normalizedCompanyName) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: invalid company name.`);
      continue;
    }

    const sanitizedDomain = sanitizeDomain(domain);
    const emailDomain = sanitizeDomain(getDomainFromEmail(email));

    const existingCompany = await prisma.company.findUnique({
      where: { normalizedName: normalizedCompanyName },
      select: {
        id: true,
        domain: true
      }
    });

    const derivedDomainForNewCompany = sanitizedDomain || emailDomain;
    if (!existingCompany && derivedDomainForNewCompany.length < 3) {
      invalidRows += 1;
      rowErrors.push(
        `Row ${row.rowNumber}: provide a valid domain or a valid work email domain.`
      );
      continue;
    }

    const verificationDomain = existingCompany?.domain ?? derivedDomainForNewCompany;
    let knownDomains = existingCompany
      ? await getKnownDomainsForCompany(existingCompany.id, existingCompany.domain)
      : [verificationDomain];

    if (
      existingCompany &&
      sanitizedDomain &&
      domainLikelyMatchesCompany(sanitizedDomain, existingCompany.domain)
    ) {
      knownDomains = dedupeDomains([...knownDomains, sanitizedDomain]);
    }

    const verification = await verifyRecruiterEmail({
      email,
      companyDomain: verificationDomain,
      knownDomains
    });

    if (verification.status === "failed") {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: ${verification.note}`);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const company =
          existingCompany ??
          (await tx.company.upsert({
            where: {
              normalizedName: normalizedCompanyName
            },
            update: {
              name: companyName,
              domain: derivedDomainForNewCompany
            },
            create: {
              name: companyName,
              normalizedName: normalizedCompanyName,
              domain: derivedDomainForNewCompany,
              aliases: []
            }
          }));

        const entry = await tx.recruiterEmail.create({
          data: {
            companyId: company.id,
            email,
            recruiterName,
            title: title || null,
            department: department || null,
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
      });

      createdCount += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skippedDuplicates += 1;
        continue;
      }

      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: failed to save row.`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalRows: rows.length,
    createdCount,
    creditsEarned: createdCount * 5,
    skippedDuplicates,
    skippedInFileDuplicates,
    invalidRows,
    errors: rowErrors.slice(0, 50)
  });
}
