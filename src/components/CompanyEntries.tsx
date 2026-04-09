"use client";

import { ReportReason } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2Icon, FlagIcon } from "lucide-react";
import { toast } from "sonner";

import { CreditBadge } from "@/components/CreditBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type RecruiterEntry = {
  id: string;
  recruiterName: string;
  title: string | null;
  department: string | null;
  email: string;
  submittedBy: string | null;
  verificationNote: string | null;
  lastVerifiedAt: string | null;
  unlocked: boolean;
};

type CompanyEntriesProps = {
  initialCredits: number;
  entries: RecruiterEntry[];
};

const REPORT_REASONS: ReportReason[] = [
  ReportReason.BOUNCED,
  ReportReason.WRONG_PERSON,
  ReportReason.NOT_RECRUITER,
  ReportReason.OTHER
];

const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  BOUNCED: "Bounced",
  WRONG_PERSON: "Wrong person",
  NOT_RECRUITER: "Not a recruiter",
  OTHER: "Other"
};

export function CompanyEntries({ initialCredits, entries }: CompanyEntriesProps) {
  const [credits, setCredits] = useState(initialCredits);
  const [rowState, setRowState] = useState(entries);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeUnlockId, setActiveUnlockId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportReasons, setReportReasons] = useState<Record<string, ReportReason>>(() =>
    Object.fromEntries(entries.map((entry) => [entry.id, ReportReason.OTHER]))
  );

  const visibleCount = useMemo(
    () => rowState.filter((entry) => entry.unlocked).length,
    [rowState]
  );

  async function unlockEntry(emailId: string) {
    setActiveUnlockId(emailId);
    setActionError(null);

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ emailId })
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        creditBalance?: number;
        recruiterName?: string;
        email?: string;
        submittedBy?: string;
        verificationNote?: string;
        lastVerifiedAt?: string;
      };

      if (!response.ok || !payload.ok) {
        setActionError(payload.error ?? "Unable to unlock this contact.");
        return;
      }

      setCredits((current) => payload.creditBalance ?? current);
      setRowState((current) =>
        current.map((entry) =>
          entry.id === emailId
            ? {
                ...entry,
                unlocked: true,
                recruiterName: payload.recruiterName ?? entry.recruiterName,
                email: payload.email ?? entry.email,
                submittedBy: payload.submittedBy ?? entry.submittedBy,
                verificationNote: payload.verificationNote ?? entry.verificationNote,
                lastVerifiedAt: payload.lastVerifiedAt ?? entry.lastVerifiedAt
              }
            : entry
        )
      );
      toast.success("Contact unlocked.");
    } catch {
      setActionError("Unable to unlock this contact.");
    } finally {
      setActiveUnlockId(null);
    }
  }

  async function reportEntry(emailId: string) {
    setActionError(null);
    setActiveReportId(emailId);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emailId,
          reason: reportReasons[emailId] ?? ReportReason.OTHER
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setActionError(payload?.error ?? "Unable to submit report.");
        return;
      }

      toast.success("Report submitted for review.");
    } catch {
      setActionError("Unable to submit report.");
    } finally {
      setActiveReportId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <CreditBadge credits={credits} />
          <Badge variant="secondary">
            Unlocked {visibleCount}/{rowState.length}
          </Badge>
        </CardContent>
      </Card>

      {credits < 1 && rowState.some((entry) => !entry.unlocked) ? (
        <Alert variant="destructive">
          <AlertDescription>
            You are out of credits. Submit a valid recruiter email to earn 5 credits. {" "}
            <Link className="font-medium underline underline-offset-4" href="/submit">
              Submit now
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        {rowState.map((entry) => {
          const title = entry.title || "Recruiter";
          const department = entry.department || "Unknown team";

          return (
            <Card key={entry.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <p
                      className={cn(
                        "text-base font-semibold",
                        !entry.unlocked && "select-none blur-[2px]"
                      )}
                    >
                      {entry.recruiterName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {title} | {department}
                    </p>
                    <p
                      className={cn(
                        "font-mono text-sm",
                        !entry.unlocked && "select-none blur-[2px]"
                      )}
                    >
                      {entry.email}
                    </p>
                  </div>

                  {entry.unlocked ? (
                    <Badge className="border-green-200 bg-green-50 text-green-700" variant="secondary">
                      <CheckCircle2Icon className="size-3.5" />
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Locked</Badge>
                  )}
                </div>

                {entry.unlocked ? (
                  <p className="text-xs text-muted-foreground">
                    Last verified:{" "}
                    {entry.lastVerifiedAt
                      ? new Date(entry.lastVerifiedAt).toLocaleDateString()
                      : "Unknown"}
                    {entry.submittedBy ? ` · Submitted by ${entry.submittedBy}` : ""}
                  </p>
                ) : (
                  <Button
                    disabled={credits < 1 || activeUnlockId !== null}
                    onClick={() => unlockEntry(entry.id)}
                    type="button"
                  >
                    {activeUnlockId === entry.id ? "Unlocking..." : "Unlock for 1 credit"}
                  </Button>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" type="button" variant="ghost">
                        <FlagIcon className="size-4" />
                        Report
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 space-y-3">
                      <p className="text-sm font-medium">Report this contact</p>
                      <Select
                        value={reportReasons[entry.id] ?? ReportReason.OTHER}
                        onValueChange={(value) =>
                          setReportReasons((current) => ({
                            ...current,
                            [entry.id]: value as ReportReason
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {REPORT_REASON_LABELS[reason]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        className="w-full"
                        disabled={activeReportId !== null}
                        onClick={() => reportEntry(entry.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {activeReportId === entry.id ? "Submitting..." : "Submit report"}
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>

                {entry.verificationNote ? (
                  <p className="text-xs text-muted-foreground">Verification: {entry.verificationNote}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
