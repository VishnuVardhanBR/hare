"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatefulButtonState = "idle" | "loading" | "success";

type StatefulButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: StatefulButtonState;
  children: ReactNode;
};

export function StatefulButton({
  className,
  state = "idle",
  children,
  disabled,
  ...props
}: StatefulButtonProps) {
  const isDisabled = disabled || state === "loading";

  return (
    <button
      aria-busy={state === "loading"}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      disabled={isDisabled}
      type="button"
      {...props}
    >
      {state === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
      {state === "success" ? <CheckIcon className="size-4" /> : null}
      <span>{children}</span>
    </button>
  );
}
