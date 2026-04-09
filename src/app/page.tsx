import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RabbitIcon } from "lucide-react";

import { SignInButton } from "@/components/AuthButtons";
import { LogoMarquee } from "@/components/LogoMarquee";
import { getRenderableLogoCompanies } from "@/components/logoMarqueeUtils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, domain: true },
    where: {
      recruiterEmails: { some: {} }
    },
    orderBy: { recruiterEmails: { _count: "desc" } },
    take: 12
  });

  const companiesWithLogo = getRenderableLogoCompanies(
    companies,
    process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  );

  return (
    <section className="space-y-12 py-4 text-center">
      <div className="space-y-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RabbitIcon className="size-7" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Recruiter contacts for tech students.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Share one verified recruiter email, earn 5 credits. Spend 1 credit to unlock one
            recruiter contact.
          </p>
        </div>

        <div className="flex justify-center">
          <SignInButton className="h-11 px-7 text-base" />
        </div>
      </div>

      <LogoMarquee companies={companiesWithLogo} />
    </section>
  );
}
