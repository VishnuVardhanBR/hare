import {
  CreditTransactionType,
  RecruiterVerificationStatus,
  type PrismaClient
} from "@prisma/client";

import { normalizeCompanyName } from "../src/lib/company";
import { prisma } from "../src/lib/prisma";

type SeedEntry = {
  companyName: string;
  companyDomain: string;
  recruiterName: string;
  email: string;
  title: string;
  department: string;
};

const SEED_ENTRIES: SeedEntry[] = [
  {
    companyName: "Apple",
    companyDomain: "apple.com",
    recruiterName: "Jane Smith",
    email: "jane.smith@apple.com",
    title: "Senior Tech Recruiter",
    department: "New Grad Team"
  },
  {
    companyName: "Apple",
    companyDomain: "apple.com",
    recruiterName: "Maya Johnson",
    email: "maya.johnson@apple.com",
    title: "University Recruiter",
    department: "iOS Engineering"
  },
  {
    companyName: "Meta",
    companyDomain: "meta.com",
    recruiterName: "Ravi Patel",
    email: "ravi.patel@meta.com",
    title: "Campus Recruiter",
    department: "Infra"
  },
  {
    companyName: "Stripe",
    companyDomain: "stripe.com",
    recruiterName: "Olivia Chen",
    email: "olivia.chen@stripe.com",
    title: "Technical Recruiter",
    department: "University Hiring"
  },
  {
    companyName: "NVIDIA",
    companyDomain: "nvidia.com",
    recruiterName: "Aaron Lee",
    email: "aaron.lee@nvidia.com",
    title: "Talent Partner",
    department: "AI/ML Recruiting"
  }
];

async function ensureSignupBonus(userId: string, db: PrismaClient): Promise<void> {
  const existing = await db.creditTransaction.findFirst({
    where: {
      userId,
      type: CreditTransactionType.SIGNUP_BONUS
    },
    select: { id: true }
  });

  if (existing) {
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      creditBalance: {
        increment: 1
      }
    }
  });

  await db.creditTransaction.create({
    data: {
      userId,
      amount: 1,
      type: CreditTransactionType.SIGNUP_BONUS
    }
  });
}

async function main() {
  const seedUser = await prisma.user.upsert({
    where: { email: "seed@example.edu" },
    update: {},
    create: {
      email: "seed@example.edu",
      displayName: "@student_seed",
      university: "example.edu"
    }
  });

  await ensureSignupBonus(seedUser.id, prisma);

  for (const entry of SEED_ENTRIES) {
    const company = await prisma.company.upsert({
      where: {
        normalizedName: normalizeCompanyName(entry.companyName)
      },
      update: {
        name: entry.companyName,
        domain: entry.companyDomain
      },
      create: {
        name: entry.companyName,
        normalizedName: normalizeCompanyName(entry.companyName),
        domain: entry.companyDomain,
        aliases: []
      }
    });

    const recruiterEmail = await prisma.recruiterEmail.upsert({
      where: {
        email: entry.email.toLowerCase()
      },
      update: {
        recruiterName: entry.recruiterName,
        title: entry.title,
        department: entry.department,
        companyId: company.id,
        verificationStatus: RecruiterVerificationStatus.VERIFIED,
        verificationNote: "Seeded data",
        lastVerifiedAt: new Date()
      },
      create: {
        companyId: company.id,
        email: entry.email.toLowerCase(),
        recruiterName: entry.recruiterName,
        title: entry.title,
        department: entry.department,
        submittedById: seedUser.id,
        verificationStatus: RecruiterVerificationStatus.VERIFIED,
        verificationNote: "Seeded data",
        lastVerifiedAt: new Date()
      }
    });

    const submissionExists = await prisma.creditTransaction.findFirst({
      where: {
        userId: seedUser.id,
        referenceId: recruiterEmail.id,
        type: CreditTransactionType.SUBMISSION
      },
      select: { id: true }
    });

    if (!submissionExists) {
      await prisma.creditTransaction.create({
        data: {
          userId: seedUser.id,
          amount: 5,
          type: CreditTransactionType.SUBMISSION,
          referenceId: recruiterEmail.id
        }
      });

      await prisma.user.update({
        where: { id: seedUser.id },
        data: {
          creditBalance: {
            increment: 5
          }
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
