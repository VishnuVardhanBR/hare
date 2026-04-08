import { ReportStatus } from "@prisma/client";

import { DeleteEmailButton, ResolveReportButton } from "@/components/AdminActions";
import { prisma } from "@/lib/prisma";
import { isAdminEmail, requireSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await requireSession();

  if (!isAdminEmail(session.user.email)) {
    return (
      <section className="panel stack-md">
        <h1 style={{ margin: 0 }}>Admin only</h1>
        <p className="muted">Your account is not listed in ADMIN_EMAILS.</p>
      </section>
    );
  }

  const [reports, recentEmails, stats] = await Promise.all([
    prisma.report.findMany({
      where: {
        status: ReportStatus.PENDING
      },
      include: {
        recruiterEmail: {
          select: {
            email: true,
            recruiterName: true,
            company: {
              select: { name: true }
            }
          }
        },
        reporter: {
          select: { displayName: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    }),
    prisma.recruiterEmail.findMany({
      include: {
        company: {
          select: { name: true }
        },
        submittedBy: {
          select: { displayName: true }
        }
      },
      orderBy: {
        submittedAt: "desc"
      },
      take: 25
    }),
    Promise.all([
      prisma.user.count(),
      prisma.recruiterEmail.count(),
      prisma.unlock.count(),
      prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      prisma.company.count()
    ]).then(([users, emails, unlocks, pendingReports, companies]) => ({
      users,
      emails,
      unlocks,
      pendingReports,
      companies
    }))
  ]);

  return (
    <section className="stack-lg">
      <div className="panel stack-sm">
        <h1 style={{ margin: 0 }}>Admin panel</h1>
        <p className="muted">Manual moderation for reports and submissions.</p>
      </div>

      <div className="panel stack-sm">
        <h2 style={{ margin: 0 }}>Platform stats</h2>
        <div className="stat-grid">
          <div>
            <p className="stat-value">{stats.users}</p>
            <p className="muted">Users</p>
          </div>
          <div>
            <p className="stat-value">{stats.companies}</p>
            <p className="muted">Companies</p>
          </div>
          <div>
            <p className="stat-value">{stats.emails}</p>
            <p className="muted">Recruiter emails</p>
          </div>
          <div>
            <p className="stat-value">{stats.unlocks}</p>
            <p className="muted">Total unlocks</p>
          </div>
          <div>
            <p className="stat-value">{stats.pendingReports}</p>
            <p className="muted">Pending reports</p>
          </div>
        </div>
      </div>

      <div className="panel stack-md">
        <h2 style={{ margin: 0 }}>Pending reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="muted">No pending reports.</p>
        ) : (
          <div className="list">
            {reports.map((report) => (
              <article className="list-item" key={report.id}>
                <div>
                  <p className="row-title">
                    {report.recruiterEmail.company.name} | {report.recruiterEmail.recruiterName}
                  </p>
                  <p className="muted">{report.recruiterEmail.email}</p>
                  <p className="muted">
                    Reason: {report.reason} | Reporter: {report.reporter.displayName}
                  </p>
                  <div className="row-wrap" style={{ marginTop: "0.5rem" }}>
                    <ResolveReportButton action="resolve" reportId={report.id} />
                    <ResolveReportButton action="dismiss" reportId={report.id} />
                    <DeleteEmailButton emailId={report.emailId} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="panel stack-md">
        <h2 style={{ margin: 0 }}>Recent submissions</h2>
        <div className="list">
          {recentEmails.map((entry) => (
            <article className="list-item" key={entry.id}>
              <div>
                <p className="row-title">
                  {entry.company.name} | {entry.recruiterName}
                </p>
                <p className="muted">{entry.email}</p>
                <p className="muted">
                  Status: {entry.verificationStatus} | Submitter: {entry.submittedBy.displayName}
                </p>
                <div style={{ marginTop: "0.5rem" }}>
                  <DeleteEmailButton emailId={entry.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
