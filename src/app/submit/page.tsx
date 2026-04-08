import { SubmitRecruiterForm } from "@/components/SubmitRecruiterForm";
import { requireSession } from "@/lib/session";

export default async function SubmitPage() {
  await requireSession();

  return (
    <section className="stack-lg">
      <div className="panel stack-sm">
        <h1 style={{ margin: 0 }}>Submit recruiter email</h1>
        <p className="muted">
          If verification passes, you earn 5 credits instantly.
        </p>
      </div>

      <div className="panel">
        <SubmitRecruiterForm />
      </div>
    </section>
  );
}
