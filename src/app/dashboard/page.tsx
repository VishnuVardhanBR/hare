import { DashboardSearchExperience } from "@/components/DashboardSearchExperience";
import { PurchaseCredits } from "@/components/PurchaseCredits";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { isCreditPurchasesEnabled } from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PRIMARY_GLASS_SURFACE_CLASS } from "@/lib/uiClasses";

export default async function DashboardPage() {
  await requireSession();
  const creditPurchasesEnabled = isCreditPurchasesEnabled();

  const [topCompanies, allCompaniesRaw] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { recruiterEmails: true }
        }
      },
      where: {
        recruiterEmails: { some: {} }
      },
      orderBy: {
        recruiterEmails: { _count: "desc" }
      },
      take: 5
    }),
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        _count: {
          select: { recruiterEmails: true }
        }
      },
      where: {
        recruiterEmails: { some: {} }
      },
      orderBy: [{ name: "asc" }]
    })
  ]);

  const popularCompanies = topCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    contactCount: company._count.recruiterEmails
  }));

  const allCompanies = allCompaniesRaw.map((company) => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    logoUrl: company.logoUrl,
    contactCount: company._count.recruiterEmails
  }));

  return (
    <section className="space-y-8">
      <DashboardSearchExperience allCompanies={allCompanies} popularCompanies={popularCompanies} />

      {creditPurchasesEnabled ? (
        <Card className={PRIMARY_GLASS_SURFACE_CLASS}>
          <CardHeader>
            <CardTitle className="text-lg">Buy credits</CardTitle>
            <CardDescription>For students who do not have contacts to share yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseCredits />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
