import { SubmitRecruiterForm } from "@/components/SubmitRecruiterForm";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export default async function SubmitPage() {
  await requireSession();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Submit recruiter email</h1>
        <p className="text-sm text-muted-foreground">
          If verification passes, you earn 5 credits instantly.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SubmitRecruiterForm />
        </CardContent>
      </Card>
    </section>
  );
}
