import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SignInButton } from "@/components/AuthButtons";
import { authOptions } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <section className="hero-panel stack-lg">
      <div className="stack-md">
        <h1>Recruiter contacts for tech students.</h1>
        <p className="muted">
          Share one verified recruiter email, earn 5 credits. Spend 1 credit to unlock one
          recruiter email.
        </p>
      </div>

      <div className="stack-md">
        <SignInButton />
        <p className="muted">
          No passwords. .edu Google login only.
        </p>
      </div>
    </section>
  );
}
