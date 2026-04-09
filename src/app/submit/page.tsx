import { SubmitModes } from "@/components/SubmitModes";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export default async function SubmitPage() {
  await requireSession();

  return (
    <section className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Submit recruiter email</h1>
        <p className="text-sm text-muted-foreground">
          If verification passes, you earn 5 credits instantly.
        </p>
      </div>

      <Card className="rounded-3xl border border-white/60 bg-white/70 shadow-xl backdrop-blur-xl">
        <CardContent className="pt-5 sm:pt-6">
          <SubmitModes />
        </CardContent>
      </Card>
    </section>
  );
}
