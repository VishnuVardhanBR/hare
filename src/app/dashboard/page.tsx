import Link from "next/link";

import { CompanySearch } from "@/components/CompanySearch";
import { PurchaseCredits } from "@/components/PurchaseCredits";
import { isCreditPurchasesEnabled } from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const creditPurchasesEnabled = isCreditPurchasesEnabled();

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
    <section className="stack-lg">
      <div className="panel row-space">
        <div>
          <p className="muted">Logged in as {user?.displayName ?? "student"}</p>
          <h1 style={{ margin: "0.2rem 0 0" }}>Credits: {user?.creditBalance ?? 0}</h1>
        </div>
        <Link className="primary-btn" href="/submit">
          Submit an email (+5)
        </Link>
      </div>

      <div className="panel stack-md">
        <h2 style={{ margin: 0 }}>Search recruiter contacts</h2>
        <CompanySearch />
      </div>

      {creditPurchasesEnabled ? (
        <div className="panel stack-md">
          <h2 style={{ margin: 0 }}>Buy credits</h2>
          <p className="muted">For students who have no contacts to share yet.</p>
          <PurchaseCredits />
        </div>
      ) : (
        <div className="panel stack-md">
          <h2 style={{ margin: 0 }}>How to earn credits</h2>
          <p className="muted">
            Credit purchases are currently disabled. Submit a valid recruiter email to earn 5
            credits.
          </p>
          <Link className="primary-btn" href="/submit">
            Submit a valid email (+5)
          </Link>
        </div>
      )}

      <div className="panel stack-md">
        <h2 style={{ margin: 0 }}>Popular companies</h2>
        <div className="list">
          {topCompanies.length === 0 ? (
            <p className="muted">No recruiter contacts yet.</p>
          ) : (
            topCompanies.map((company) => (
              <Link className="list-item" href={`/company/${company.id}`} key={company.id}>
                <p className="row-title">{company.name}</p>
                <p className="muted">{company._count.recruiterEmails} contacts</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
