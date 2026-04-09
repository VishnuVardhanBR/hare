import { RecruiterVerificationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { normalizeCompanyName, sanitizeDomain } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/session";

const REQUIRED_HEADERS = ["company", "domain", "email", "recruiter_name"] as const;
const OPTIONAL_HEADERS = ["title", "department"] as const;
const ALLOWED_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
const emailSchema = z.string().email();

type ParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
};

function parseCsv(raw: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((cell) => cell.trim().toLowerCase());

  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((cell) => cell.trim());
    const record = Object.fromEntries(
      headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""])
    );

    return {
      rowNumber: index + 2,
      values: record
    };
  });

  return { headers, rows };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required headers: ${missingHeaders.join(", ")}.`
      },
      { status: 400 }
    );
  }

  const invalidHeaders = headers.filter((header) => !ALLOWED_HEADERS.includes(header as never));
  if (invalidHeaders.length > 0) {
    return NextResponse.json(
      {
        error: `Unexpected headers: ${invalidHeaders.join(", ")}. Allowed headers: ${ALLOWED_HEADERS.join(", ")}.`
      },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });
  }

  let createdCount = 0;
  let skippedDuplicates = 0;
  let invalidRows = 0;
  const rowErrors: string[] = [];

  for (const row of rows) {
    const companyName = (row.values.company ?? "").trim();
    const domain = (row.values.domain ?? "").trim();
    const email = (row.values.email ?? "").trim().toLowerCase();
    const recruiterName = (row.values.recruiter_name ?? "").trim();
    const title = (row.values.title ?? "").trim();
    const department = (row.values.department ?? "").trim();

    if (!companyName || !domain || !email || !recruiterName) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: missing one or more required fields.`);
      continue;
    }

    if (!emailSchema.safeParse(email).success) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: invalid email "${email}".`);
      continue;
    }

    const normalizedCompanyName = normalizeCompanyName(companyName);
    if (!normalizedCompanyName) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: invalid company name.`);
      continue;
    }

    const sanitizedDomain = sanitizeDomain(domain);
    if (!sanitizedDomain) {
      invalidRows += 1;
      rowErrors.push(`Row ${row.rowNumber}: invalid domain.`);
      continue;
    }

    const company = await prisma.company.upsert({
      where: {
        normalizedName: normalizedCompanyName
      },
      update: {
        name: companyName,
        domain: sanitizedDomain
      },
      create: {
        name: companyName,
        normalizedName: normalizedCompanyName,
        domain: sanitizedDomain,
        aliases: []
      }
    });

    const existingEmail = await prisma.recruiterEmail.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingEmail) {
      skippedDuplicates += 1;
      continue;
    }

    await prisma.recruiterEmail.create({
      data: {
        companyId: company.id,
        email,
        recruiterName,
        title: title || null,
        department: department || null,
        submittedById: session.user.id,
        verificationStatus: RecruiterVerificationStatus.VERIFIED,
        verificationNote: "Imported from CSV (admin bulk upload)",
        lastVerifiedAt: new Date()
      }
    });

    createdCount += 1;
  }

  return NextResponse.json({
    ok: true,
    totalRows: rows.length,
    createdCount,
    skippedDuplicates,
    invalidRows,
    errors: rowErrors.slice(0, 25)
  });
}
