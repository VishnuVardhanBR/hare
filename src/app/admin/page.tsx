import Link from "next/link";
import { ReportStatus } from "@prisma/client";

import { DeleteEmailButton, ResolveReportButton } from "@/components/AdminActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { isAdminEmail, requireSession } from "@/lib/session";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const session = await requireSession();

  if (!isAdminEmail(session.user.email)) {
    return (
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Admin only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Your account is not listed in ADMIN_EMAILS.</p>
          </CardContent>
        </Card>
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
            id: true,
            email: true,
            recruiterName: true,
            verificationStatus: true,
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
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
          <p className="text-sm text-muted-foreground">
            Manual moderation for reports and recruiter email submissions.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/bulk-upload">Bulk upload CSV</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Companies" value={stats.companies} />
        <StatCard label="Recruiter emails" value={stats.emails} />
        <StatCard label="Total unlocks" value={stats.unlocks} />
        <StatCard label="Pending reports" value={stats.pendingReports} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending reports.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Recruiter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead className="w-[240px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.recruiterEmail.company.name}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p>{report.recruiterEmail.recruiterName}</p>
                        <p className="text-xs text-muted-foreground">{report.recruiterEmail.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.reason}</Badge>
                    </TableCell>
                    <TableCell>{report.reporter.displayName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <ResolveReportButton action="resolve" reportId={report.id} />
                        <ResolveReportButton action="dismiss" reportId={report.id} />
                        <DeleteEmailButton emailId={report.emailId} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEmails.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.company.name}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p>{entry.recruiterName}</p>
                      <p className="text-xs text-muted-foreground">{entry.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="capitalize"
                      variant={entry.verificationStatus === "VERIFIED" ? "default" : "destructive"}
                    >
                      {entry.verificationStatus.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.submittedBy.displayName}</TableCell>
                  <TableCell>
                    <DeleteEmailButton emailId={entry.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
