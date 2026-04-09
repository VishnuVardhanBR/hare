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
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 }
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];
type PageSearchParams = Record<string, string | string[] | undefined>;

type DailySeriesRow = {
  day: Date;
  submissions: number;
  unlocks: number;
  earnedCredits: number;
  spentCredits: number;
  purchasedCredits: number;
};

type TopCompanyRow = {
  companyId: string;
  companyName: string;
  unlocks: number;
  unlockers: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.00x";
  }

  return `${value.toFixed(2)}x`;
}

function formatSigned(value: number): string {
  const formatted = formatInteger(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatDateLabel(day: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(day);
}

function getScalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseRange(rangeParam: string | undefined): RangeKey {
  return rangeParam === "30d" ? "30d" : "7d";
}

function buildLinePath(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? padding + plotWidth / 2
          : padding + (index / (values.length - 1)) * plotWidth;
      const y = padding + (1 - value / maxValue) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineTrendChart({ data }: { data: DailySeriesRow[] }) {
  const width = 720;
  const height = 240;
  const padding = 24;
  const maxValue = Math.max(
    ...data.map((point) => Math.max(point.submissions, point.unlocks)),
    1
  );
  const submissionPath = buildLinePath(
    data.map((point) => point.submissions),
    width,
    height,
    padding
  );
  const unlockPath = buildLinePath(
    data.map((point) => point.unlocks),
    width,
    height,
    padding
  );
  const labelIndexes = Array.from(
    new Set([0, Math.floor((data.length - 1) / 2), data.length - 1].filter((value) => value >= 0))
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="size-2 rounded-full bg-[var(--color-chart-1)]" />
          Verified submissions
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="size-2 rounded-full bg-[var(--color-chart-4)]" />
          Unlocks
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          aria-label="Verified submissions and unlocks trend"
          className="h-56 min-w-[620px] w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((stop, index) => {
            const y = padding + (1 - stop) * (height - padding * 2);
            return (
              <line
                key={`grid-${index}`}
                stroke="rgba(100, 116, 139, 0.18)"
                strokeDasharray={index === 0 ? "0" : "4 4"}
                strokeWidth="1"
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
              />
            );
          })}

          <path d={submissionPath} fill="none" stroke="var(--color-chart-1)" strokeWidth="2.5" />
          <path d={unlockPath} fill="none" stroke="var(--color-chart-4)" strokeWidth="2.5" />

          {labelIndexes.map((index) => {
            const x =
              data.length === 1
                ? padding + (width - padding * 2) / 2
                : padding + (index / (data.length - 1)) * (width - padding * 2);

            return (
              <text
                fill="rgba(51, 65, 85, 0.85)"
                fontSize="11"
                key={`x-label-${index}`}
                textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
                x={x}
                y={height - 6}
              >
                {formatDateLabel(data[index].day)}
              </text>
            );
          })}

          <text fill="rgba(51, 65, 85, 0.8)" fontSize="11" x={padding} y={padding - 6}>
            {formatInteger(maxValue)}
          </text>
          <text fill="rgba(51, 65, 85, 0.8)" fontSize="11" x={padding} y={height - padding + 14}>
            0
          </text>
        </svg>
      </div>
    </div>
  );
}

function CreditsBarChart({ data }: { data: DailySeriesRow[] }) {
  const width = 720;
  const height = 240;
  const padding = 24;
  const maxValue = Math.max(
    ...data.map((point) =>
      Math.max(point.earnedCredits, point.spentCredits, point.purchasedCredits)
    ),
    1
  );
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const band = data.length === 0 ? 0 : plotWidth / data.length;
  const barWidth = Math.max((band - 4) / 3, 1);
  const groupInset = Math.max((band - barWidth * 3) / 2, 0);
  const labelIndexes = Array.from(
    new Set([0, Math.floor((data.length - 1) / 2), data.length - 1].filter((value) => value >= 0))
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="size-2 rounded-full bg-[var(--color-chart-1)]" />
          Earned
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="size-2 rounded-full bg-[var(--color-chart-2)]" />
          Spent
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="size-2 rounded-full bg-[var(--color-chart-4)]" />
          Purchased
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          aria-label="Credits flow trend"
          className="h-56 min-w-[620px] w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((stop, index) => {
            const y = padding + (1 - stop) * plotHeight;
            return (
              <line
                key={`credit-grid-${index}`}
                stroke="rgba(100, 116, 139, 0.18)"
                strokeDasharray={index === 0 ? "0" : "4 4"}
                strokeWidth="1"
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
              />
            );
          })}

          {data.map((point, index) => {
            const xBase = padding + index * band + groupInset;
            const entries = [
              { value: point.earnedCredits, color: "var(--color-chart-1)" },
              { value: point.spentCredits, color: "var(--color-chart-2)" },
              { value: point.purchasedCredits, color: "var(--color-chart-4)" }
            ];

            return entries.map((entry, offset) => {
              const barHeight = (entry.value / maxValue) * plotHeight;
              const x = xBase + offset * barWidth;
              const y = padding + (plotHeight - barHeight);

              return (
                <rect
                  fill={entry.color}
                  height={Math.max(barHeight, 1)}
                  key={`bar-${index}-${offset}`}
                  opacity="0.9"
                  rx="1.5"
                  width={barWidth - 0.6}
                  x={x}
                  y={y}
                />
              );
            });
          })}

          {labelIndexes.map((index) => {
            const x = padding + index * band + band / 2;
            return (
              <text
                fill="rgba(51, 65, 85, 0.85)"
                fontSize="11"
                key={`credit-label-${index}`}
                textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
                x={index === 0 ? padding : index === data.length - 1 ? width - padding : x}
                y={height - 6}
              >
                {formatDateLabel(data[index].day)}
              </text>
            );
          })}

          <text fill="rgba(51, 65, 85, 0.8)" fontSize="11" x={padding} y={padding - 6}>
            {formatInteger(maxValue)}
          </text>
          <text fill="rgba(51, 65, 85, 0.8)" fontSize="11" x={padding} y={height - padding + 14}>
            0
          </text>
        </svg>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "accent" | "warning";
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border border-white/60 bg-white/70 py-4 shadow-sm backdrop-blur",
        tone === "accent" && "border-primary/30 bg-primary/10",
        tone === "warning" && "border-amber-300/50 bg-amber-50/70"
      )}
    >
      <CardContent className="space-y-1.5 px-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
        {helper ? <p className="text-xs text-slate-600">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
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

  const params = (await searchParams) ?? {};
  const range = parseRange(getScalarParam(params.range));
  const rangeConfig = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[0];
  const rangeStart = new Date();
  rangeStart.setUTCHours(0, 0, 0, 0);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (rangeConfig.days - 1));

  const [pendingReports, pendingReportsCount, reportsInWindow, newCompanies, topCompaniesRaw, uniqueCountsRaw, dailySeriesRaw] =
    await Promise.all([
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
                select: { id: true, name: true }
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
      prisma.report.count({
        where: {
          status: ReportStatus.PENDING
        }
      }),
      prisma.report.count({
        where: {
          createdAt: {
            gte: rangeStart
          }
        }
      }),
      prisma.company.count({
        where: {
          createdAt: {
            gte: rangeStart
          }
        }
      }),
      prisma.$queryRaw<
        Array<{
          company_id: string;
          company_name: string;
          unlocks: unknown;
          unlockers: unknown;
        }>
      >`
        SELECT
          c.id AS company_id,
          c.name AS company_name,
          COUNT(u.id) AS unlocks,
          COUNT(DISTINCT u."userId") AS unlockers
        FROM "Unlock" u
        INNER JOIN "RecruiterEmail" re ON re.id = u."emailId"
        INNER JOIN "Company" c ON c.id = re."companyId"
        WHERE u."unlockedAt" >= ${rangeStart}
        GROUP BY c.id, c.name
        ORDER BY unlocks DESC, c.name ASC
        LIMIT 10
      `,
      prisma.$queryRaw<
        Array<{
          unique_submitters: unknown;
          unique_unlockers: unknown;
        }>
      >`
        SELECT
          (SELECT COUNT(DISTINCT "submittedById") FROM "RecruiterEmail" WHERE "submittedAt" >= ${rangeStart}) AS unique_submitters,
          (SELECT COUNT(DISTINCT "userId") FROM "Unlock" WHERE "unlockedAt" >= ${rangeStart}) AS unique_unlockers
      `,
      prisma.$queryRaw<
        Array<{
          day: Date;
          submissions: unknown;
          unlocks: unknown;
          earned_credits: unknown;
          spent_credits: unknown;
          purchased_credits: unknown;
        }>
      >`
        SELECT
          days.day::date AS day,
          COALESCE(submissions.count, 0)::int AS submissions,
          COALESCE(unlocks.count, 0)::int AS unlocks,
          COALESCE(credits.earned, 0)::int AS earned_credits,
          COALESCE(credits.spent, 0)::int AS spent_credits,
          COALESCE(credits.purchased, 0)::int AS purchased_credits
        FROM generate_series(
          date_trunc('day', NOW()) - interval '29 days',
          date_trunc('day', NOW()),
          interval '1 day'
        ) AS days(day)
        LEFT JOIN (
          SELECT date_trunc('day', "submittedAt") AS day, COUNT(*)::int AS count
          FROM "RecruiterEmail"
          WHERE "submittedAt" >= NOW() - interval '30 days'
          GROUP BY 1
        ) AS submissions ON submissions.day = days.day
        LEFT JOIN (
          SELECT date_trunc('day', "unlockedAt") AS day, COUNT(*)::int AS count
          FROM "Unlock"
          WHERE "unlockedAt" >= NOW() - interval '30 days'
          GROUP BY 1
        ) AS unlocks ON unlocks.day = days.day
        LEFT JOIN (
          SELECT
            date_trunc('day', "createdAt") AS day,
            SUM(CASE WHEN "type" = 'SUBMISSION'::"CreditTransactionType" AND "amount" > 0 THEN "amount" ELSE 0 END)::int AS earned,
            SUM(CASE WHEN "type" = 'UNLOCK'::"CreditTransactionType" AND "amount" < 0 THEN ABS("amount") ELSE 0 END)::int AS spent,
            SUM(CASE WHEN "type" = 'PURCHASE'::"CreditTransactionType" AND "amount" > 0 THEN "amount" ELSE 0 END)::int AS purchased
          FROM "CreditTransaction"
          WHERE "createdAt" >= NOW() - interval '30 days'
          GROUP BY 1
        ) AS credits ON credits.day = days.day
        ORDER BY days.day ASC
      `
    ]);

  const topCompanies: TopCompanyRow[] = topCompaniesRaw.map((row) => ({
    companyId: row.company_id,
    companyName: row.company_name,
    unlocks: toNumber(row.unlocks),
    unlockers: toNumber(row.unlockers)
  }));

  const uniqueCounts = uniqueCountsRaw[0] ?? {
    unique_submitters: 0,
    unique_unlockers: 0
  };
  const uniqueSubmitters = toNumber(uniqueCounts.unique_submitters);
  const uniqueUnlockers = toNumber(uniqueCounts.unique_unlockers);

  const dailySeries: DailySeriesRow[] = dailySeriesRaw.map((row) => ({
    day: row.day,
    submissions: toNumber(row.submissions),
    unlocks: toNumber(row.unlocks),
    earnedCredits: toNumber(row.earned_credits),
    spentCredits: toNumber(row.spent_credits),
    purchasedCredits: toNumber(row.purchased_credits)
  }));

  const visibleSeries = dailySeries.slice(-rangeConfig.days);
  const submissionsCount = sumBy(visibleSeries, (row) => row.submissions);
  const unlockCount = sumBy(visibleSeries, (row) => row.unlocks);
  const earnedCredits = sumBy(visibleSeries, (row) => row.earnedCredits);
  const spentCredits = sumBy(visibleSeries, (row) => row.spentCredits);
  const purchasedCredits = sumBy(visibleSeries, (row) => row.purchasedCredits);
  const netCredits = earnedCredits + purchasedCredits - spentCredits;
  const liquidityRatio = submissionsCount === 0 ? 0 : unlockCount / submissionsCount;
  const reportRate = unlockCount === 0 ? 0 : (reportsInWindow / unlockCount) * 100;

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/55 p-5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-r from-primary/15 via-sky-300/10 to-amber-200/10 blur-2xl" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin dashboard</h1>
              <p className="text-sm text-slate-600">
                Marketplace health, trust signals, and moderation actions in one view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/75 p-1 shadow-sm backdrop-blur">
                {RANGE_OPTIONS.map((option) => {
                  const active = option.key === range;
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-medium text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        active
                          ? "bg-primary text-primary-foreground shadow-[0_10px_25px_-15px_rgba(30,64,175,0.85)]"
                          : "hover:bg-white hover:text-slate-900"
                      )}
                      href={`/admin?range=${option.key}`}
                      key={option.key}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>

              <Button asChild className="rounded-full">
                <Link href="/admin/bulk-upload">Bulk upload CSV</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              helper={`${rangeConfig.days}-day window`}
              label="Unlock / Submit ratio"
              tone="accent"
              value={formatRatio(liquidityRatio)}
            />
            <MetricCard label="Verified submissions" value={formatInteger(submissionsCount)} />
            <MetricCard label="Unlocks" value={formatInteger(unlockCount)} />
            <MetricCard label="Pending reports" tone="warning" value={formatInteger(pendingReportsCount)} />
            <MetricCard label="Unique submitters" value={formatInteger(uniqueSubmitters)} />
            <MetricCard label="Unique unlockers" value={formatInteger(uniqueUnlockers)} />
            <MetricCard
              helper={`${reportsInWindow} reports in window`}
              label="Report rate"
              value={`${reportRate.toFixed(1)} / 100 unlocks`}
            />
            <MetricCard
              helper={`Earned +${formatInteger(earnedCredits)} · Purchased +${formatInteger(purchasedCredits)} · Spent -${formatInteger(spentCredits)}`}
              label="Net credit delta"
              value={formatSigned(netCredits)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="rounded-3xl border border-white/60 bg-white/70 py-5 shadow-sm backdrop-blur">
              <CardHeader className="space-y-1 px-5 sm:px-6">
                <CardTitle className="text-base font-semibold">Supply vs demand trend</CardTitle>
                <p className="text-xs text-slate-600">
                  Verified submissions and unlocks over the last {rangeConfig.days} days.
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-2 sm:px-6">
                <LineTrendChart data={visibleSeries} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/60 bg-white/70 py-5 shadow-sm backdrop-blur">
              <CardHeader className="space-y-1 px-5 sm:px-6">
                <CardTitle className="text-base font-semibold">Credits flow trend</CardTitle>
                <p className="text-xs text-slate-600">
                  Earned, spent, and purchased credits over the last {rangeConfig.days} days.
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-2 sm:px-6">
                <CreditsBarChart data={visibleSeries} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-3xl border border-white/60 bg-white/70 py-5 shadow-sm backdrop-blur">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="text-lg">Pending reports ({formatInteger(pendingReportsCount)})</CardTitle>
            {pendingReportsCount > pendingReports.length ? (
              <p className="text-xs text-slate-600">Showing latest {pendingReports.length} reports.</p>
            ) : null}
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {pendingReports.length === 0 ? (
              <p className="text-sm text-slate-600">No pending reports.</p>
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
                  {pendingReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.recruiterEmail.company.name}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>{report.recruiterEmail.recruiterName}</p>
                          <p className="text-xs text-slate-500">{report.recruiterEmail.email}</p>
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

        <Card className="rounded-3xl border border-white/60 bg-white/70 py-5 shadow-sm backdrop-blur">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="text-lg">Top companies by unlocks</CardTitle>
            <p className="text-xs text-slate-600">
              Last {rangeConfig.days} days · {formatInteger(newCompanies)} new companies added
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {topCompanies.length === 0 ? (
              <p className="text-sm text-slate-600">No unlock activity in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Unlocks</TableHead>
                    <TableHead className="text-right">Unique unlockers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCompanies.map((company) => (
                    <TableRow key={company.companyId}>
                      <TableCell className="font-medium">
                        <Link
                          className="cursor-pointer rounded-sm text-slate-900 underline-offset-4 hover:underline"
                          href={`/company/${company.companyId}`}
                        >
                          {company.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatInteger(company.unlocks)}</TableCell>
                      <TableCell className="text-right">{formatInteger(company.unlockers)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
