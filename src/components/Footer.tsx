import Link from "next/link";

import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-12">
      <Separator />
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <Link className="font-medium text-primary hover:underline" href="/opt-out">
          Recruiter Opt-Out
        </Link>
        <p>© {new Date().getFullYear()} Hare</p>
      </div>
    </footer>
  );
}
