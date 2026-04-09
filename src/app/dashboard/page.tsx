import Link from "next/link";

import { CompanySearch } from "@/components/CompanySearch";
import { CreditBadge } from "@/components/CreditBadge";
import { PurchaseCredits } from "@/components/PurchaseCredits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { isCreditPurchasesEnabled } from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";
import { isAdminEmail, requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const creditPurchasesEnabled = isCreditPurchasesEnabled();
  const isAdmin = isAdminEmail(session.user.email);

  const [user, topCompanies] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        displayName: true,
        creditBalance: true
      }
    }),
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            recruiterEmails: true
          }
        }
      },
      orderBy: {
        recruiterEmails: {
          _count: "desc"
        }
      },
      take: 5
    })
  ]);

  return (
    <section className="space-y-8">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Welcome, {user?.displayName ?? "student"}</p>
            <CreditBadge credits={user?.creditBalance ?? 0} unlimited={isAdmin} />
          </div>

          <Button asChild>
            <Link href="/submit">Submit email (+5)</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search recruiter contacts</CardTitle>
          <CardDescription>Search by company and open contact lists instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanySearch />
        </CardContent>
      </Card>

      {creditPurchasesEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buy credits</CardTitle>
            <CardDescription>For students who do not have contacts to share yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseCredits />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to earn credits</CardTitle>
            <CardDescription>
              Credit purchases are currently disabled. Submit a valid recruiter email to earn 5
              credits.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular companies</CardTitle>
          <CardDescription>Companies with the most available recruiter contacts.</CardDescription>
        </CardHeader>
        <CardContent>
          {topCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recruiter contacts yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {topCompanies.map((company) => (
                <Link
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  href={`/company/${company.id}`}
                  key={company.id}
                >
                  <span>{company.name}</span>
                  <Badge variant="secondary">{company._count.recruiterEmails}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
