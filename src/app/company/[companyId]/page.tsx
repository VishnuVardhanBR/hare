import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { CompanyEntries } from "@/components/CompanyEntries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { maskEmail, maskName } from "@/lib/masking";
import { prisma } from "@/lib/prisma";
import { isAdminEmail, requireSession } from "@/lib/session";

type CompanyPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companyId } = await params;
  const session = await requireSession();
  const isAdmin = isAdminEmail(session.user.email);

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
    <section className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        href="/dashboard"
      >
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
        <p className="text-sm text-muted-foreground">{company.recruiterEmails.length} recruiter contacts</p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No contacts yet</CardTitle>
            <CardDescription>Be the first to submit and earn 5 credits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium text-primary hover:underline" href="/submit">
              Submit a recruiter email
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CompanyEntries entries={entries} initialCredits={user?.creditBalance ?? 0} isAdmin={isAdmin} />
      )}
    </section>
  );
}
