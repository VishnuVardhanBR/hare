"use client";

import { ReportReason } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

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

export function CompanyEntries({ initialCredits, entries }: CompanyEntriesProps) {
  const [credits, setCredits] = useState(initialCredits);
  const [rowState, setRowState] = useState(entries);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeUnlockId, setActiveUnlockId] = useState<string | null>(null);
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

      setCredits(payload.creditBalance ?? credits);
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
    } catch {
      setActionError("Unable to unlock this contact.");
    } finally {
      setActiveUnlockId(null);
    }
  }

  async function reportEntry(emailId: string) {
    setActionError(null);

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
    }
  }

  return (
    <div className="stack-lg">
      <div className="panel row-space">
        <p>
          Credits: <strong>{credits}</strong>
        </p>
        <p className="muted">
          Unlocked: {visibleCount}/{rowState.length}
        </p>
      </div>

      {credits < 1 ? (
        <div className="panel stack-sm">
          <p className="muted">
            You are out of credits. Submit a valid recruiter email to earn 5 credits.
          </p>
          <Link className="primary-btn" href="/submit">
            Submit a valid email (+5)
          </Link>
        </div>
      ) : null}

      {actionError ? <p className="error-text">{actionError}</p> : null}

      <div className="stack-md">
        {rowState.map((entry) => {
          const title = entry.title || "Recruiter";
          const department = entry.department || "Unknown team";

          return (
            <article className="panel stack-sm" key={entry.id}>
              <p className="row-title">{entry.recruiterName}</p>
              <p>{title} | {department}</p>
              <p>{entry.email}</p>

              {entry.unlocked ? (
                <p className="muted">
                  Last verified: {entry.lastVerifiedAt ? new Date(entry.lastVerifiedAt).toLocaleDateString() : "Unknown"}{entry.submittedBy ? ` | Submitted by: ${entry.submittedBy}` : ""}
                </p>
              ) : (
                <button
                  className="primary-btn"
                  disabled={credits < 1 || activeUnlockId !== null}
                  onClick={() => unlockEntry(entry.id)}
                  type="button"
                >
                  {activeUnlockId === entry.id ? "Unlocking..." : "Unlock for 1 credit"}
                </button>
              )}

              <div className="row-wrap">
                <select
                  className="select-input"
                  value={reportReasons[entry.id] ?? ReportReason.OTHER}
                  onChange={(event) =>
                    setReportReasons((current) => ({
                      ...current,
                      [entry.id]: event.target.value as ReportReason
                    }))
                  }
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <button className="ghost-btn" onClick={() => reportEntry(entry.id)} type="button">
                  Report
                </button>
              </div>

              {entry.verificationNote ? <p className="muted">Verification: {entry.verificationNote}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
