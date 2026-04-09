"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

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
    <Button
      disabled={loading}
      onClick={handleClick}
      size="sm"
      type="button"
      variant={action === "resolve" ? "default" : "outline"}
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
      {action === "resolve" ? "Resolve" : "Dismiss"}
    </Button>
  );
}

export function DeleteEmailButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/delete-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId })
      });

      if (response.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="destructive">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete recruiter email?</DialogTitle>
          <DialogDescription>
            This will permanently remove the recruiter email and all associated reports and unlock
            records.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={loading} type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={loading}
            onClick={handleDelete}
            type="button"
            variant="destructive"
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Delete email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
