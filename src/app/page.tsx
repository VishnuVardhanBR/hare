import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RabbitIcon } from "lucide-react";

import { SignInButton } from "@/components/AuthButtons";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Share",
    description: "Submit one verified recruiter work email from your past outreach or recruiting history."
  },
  {
    step: "02",
    title: "Earn",
    description: "Every verified submission gives you 5 credits instantly in your account."
  },
  {
    step: "03",
    title: "Unlock",
    description: "Spend 1 credit to reveal one recruiter contact that another student shared."
  }
] as const;

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-16 py-4 text-center">
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

        <p className="text-sm text-slate-400">No passwords. University Google email required.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step}>
              <CardContent className="space-y-3 pt-6 text-left">
                <p className="text-sm font-medium text-primary">Step {item.step}</p>
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
