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

export default async function DashboardPage() {
  await requireSession();
  const creditPurchasesEnabled = isCreditPurchasesEnabled();

  const topCompanies = await prisma.company.findMany({
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
  });

  const popularCompanies = topCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    contactCount: company._count.recruiterEmails
  }));

  return (
    <section className="space-y-8">
      <DashboardSearchExperience popularCompanies={popularCompanies} />

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
      ) : null}
    </section>
  );
}
