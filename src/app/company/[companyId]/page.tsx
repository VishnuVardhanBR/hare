import { notFound } from "next/navigation";

import { CompanyEntries } from "@/components/CompanyEntries";
import { maskEmail, maskName } from "@/lib/masking";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type CompanyPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companyId } = await params;
  const session = await requireSession();

  const [company, unlocks, user] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        recruiterEmails: {
          include: {
            submittedBy: {
              select: {
                displayName: true
              }
            }
          },
          orderBy: {
            submittedAt: "desc"
          }
        }
      }
    }),
    prisma.unlock.findMany({
      where: {
        userId: session.user.id,
        recruiterEmail: {
          companyId
        }
      },
      select: {
        emailId: true
      }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true }
    })
  ]);

  if (!company) {
    notFound();
  }

  const unlockedEmailIds = new Set(unlocks.map((entry) => entry.emailId));

  const entries = company.recruiterEmails.map((entry) => {
    const unlocked = unlockedEmailIds.has(entry.id);
    return {
      id: entry.id,
      recruiterName: unlocked ? entry.recruiterName : maskName(entry.recruiterName),
      title: entry.title,
      department: entry.department,
      email: unlocked ? entry.email : maskEmail(entry.email),
      submittedBy: unlocked ? entry.submittedBy.displayName : null,
      verificationNote: unlocked ? entry.verificationNote : null,
      lastVerifiedAt: unlocked ? (entry.lastVerifiedAt?.toISOString() ?? null) : null,
      unlocked
    };
  });

  return (
    <section className="stack-lg">
      <div className="panel stack-sm">
        <h1 style={{ margin: 0 }}>{company.name}</h1>
        <p className="muted">{company.recruiterEmails.length} recruiter contacts</p>
      </div>

      {entries.length === 0 ? (
        <div className="panel stack-md">
          <p className="muted">No contacts yet for this company.</p>
          <p className="muted">Be the first to submit and earn 5 credits.</p>
        </div>
      ) : (
        <CompanyEntries initialCredits={user?.creditBalance ?? 0} entries={entries} />
      )}

      <p className="muted">
        Locked rows intentionally show role and department, while identity details stay masked until unlock.
      </p>
    </section>
  );
}
