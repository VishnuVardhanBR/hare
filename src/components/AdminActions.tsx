"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveReportButton({
  reportId,
  action
}: {
  reportId: string;
  action: "resolve" | "dismiss";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/resolve-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action })
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={action === "resolve" ? "primary-btn" : "ghost-btn"}
      disabled={loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? "..." : action === "resolve" ? "Resolve" : "Dismiss"}
    </button>
  );
}

export function DeleteEmailButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Delete this recruiter email and all associated reports/unlocks?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/delete-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId })
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="ghost-btn" disabled={loading} onClick={handleClick} type="button">
      {loading ? "..." : "Delete email"}
    </button>
  );
}
