"use client";

import { ReportReason } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2Icon, FlagIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs } from "@/components/ui/tabs";
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
  isAdmin: boolean;
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

export function CompanyEntries({ initialCredits, entries, isAdmin }: CompanyEntriesProps) {
  const [activeTab, setActiveTab] = useState<"all" | "locked" | "unlocked">("all");
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
  const filteredEntries = useMemo(() => {
    if (activeTab === "locked") {
      return rowState.filter((entry) => !entry.unlocked);
    }
    if (activeTab === "unlocked") {
      return rowState.filter((entry) => entry.unlocked);
    }
    return rowState;
  }, [activeTab, rowState]);

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
      {!isAdmin && credits < 1 && rowState.some((entry) => !entry.unlocked) ? (
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
        <Tabs
          tabs={[
            { title: `All (${rowState.length})`, value: "all" },
            { title: `Locked (${rowState.length - visibleCount})`, value: "locked" },
            { title: `Unlocked (${visibleCount})`, value: "unlocked" }
          ]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "all" | "locked" | "unlocked")}
        />

        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No contacts in this view.
            </CardContent>
          </Card>
        ) : null}

        {filteredEntries.map((entry) => {
          const title = entry.title || "Recruiter";
          const department = entry.department || "Unknown team";

          return (
            <Card
              className="rounded-3xl border border-white/65 bg-white/65 shadow-lg shadow-slate-900/5 backdrop-blur-xl"
              key={entry.id}
              size="sm"
            >
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p
                    className={cn(
                      "text-base font-semibold leading-tight",
                      !entry.unlocked && "select-none blur-[2px]"
                    )}
                  >
                    {entry.recruiterName}
                  </p>

                  {entry.unlocked ? (
                    <p className="inline-flex h-8 w-fit items-center gap-1.5 self-start rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 text-sm font-medium text-emerald-700 backdrop-blur">
                      <CheckCircle2Icon className="size-3.5" />
                      Unlocked
                    </p>
                  ) : (
                    <Button
                      className="h-8 self-start rounded-full border-primary/80 bg-primary px-3.5 text-sm text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                      disabled={(!isAdmin && credits < 1) || activeUnlockId !== null}
                      onClick={() => unlockEntry(entry.id)}
                      type="button"
                    >
                      {activeUnlockId === entry.id
                        ? "Unlocking..."
                        : isAdmin
                          ? "Unlock contact"
                          : "Unlock for 1 credit"}
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {title} | {department}
                </p>

                <p
                  className={cn(
                    "font-mono text-sm leading-tight",
                    !entry.unlocked && "select-none blur-[2px]"
                  )}
                >
                  {entry.email}
                </p>

                <div className="flex items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        className="h-7 cursor-pointer rounded-full px-2 text-xs text-slate-700 hover:bg-white/70"
                        size="xs"
                        type="button"
                        variant="ghost"
                      >
                        <FlagIcon className="size-3.5" />
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
