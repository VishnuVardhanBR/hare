import { existsSync, readFileSync } from "node:fs";

import {
  CreditTransactionType,
  RecruiterVerificationStatus
} from "@prisma/client";

import { normalizeCompanyName, sanitizeDomain } from "../src/lib/company";
import { prisma } from "../src/lib/prisma";

type CsvRow = {
  company: string;
  domain: string;
  email: string;
  recruiter_name: string;
  title: string;
  department: string;
};

function parseCsv(raw: string): CsvRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((cell) => cell.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((cell) => cell.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as CsvRow;

    return row;
  });
}

async function ensureImporter(email: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName: "@admin_import",
      university: email.split("@")[1] || null
    }
  });

  const signupBonus = await prisma.creditTransaction.findFirst({
    where: {
      userId: user.id,
      type: CreditTransactionType.SIGNUP_BONUS
    },
    select: { id: true }
  });

  if (!signupBonus) {
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 1,
        type: CreditTransactionType.SIGNUP_BONUS
      }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        creditBalance: {
          increment: 1
        }
      }
    });
  }

  return user.id;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    throw new Error("Usage: npm run seed:import -- /absolute/path/to/recruiters.csv");
  }

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const importerEmail = process.env.IMPORTER_EMAIL ?? "admin@example.edu";
  const importerId = await ensureImporter(importerEmail);

  const rawCsv = readFileSync(csvPath, "utf8");
  const rows = parseCsv(rawCsv);

  if (!rows.length) {
    throw new Error("No rows found. Expected CSV headers: company,domain,email,recruiter_name,title,department");
  }

  let createdCount = 0;

  for (const row of rows) {
    const normalizedCompany = normalizeCompanyName(row.company);

    const company = await prisma.company.upsert({
      where: {
        normalizedName: normalizedCompany
      },
      update: {
        name: row.company,
        domain: sanitizeDomain(row.domain)
      },
      create: {
        name: row.company,
        normalizedName: normalizedCompany,
        domain: sanitizeDomain(row.domain),
        aliases: []
      }
    });

    const normalizedEmail = row.email.trim().toLowerCase();
    const existing = await prisma.recruiterEmail.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    await prisma.recruiterEmail.create({
      data: {
        companyId: company.id,
        email: normalizedEmail,
        recruiterName: row.recruiter_name,
        title: row.title || null,
        department: row.department || null,
        submittedById: importerId,
        verificationStatus: RecruiterVerificationStatus.VERIFIED,
        verificationNote: "Imported from CSV",
        lastVerifiedAt: new Date()
      }
    });

    createdCount += 1;
  }

  console.log(`Imported ${createdCount} recruiter emails.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
