"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      disabled={isDisabled}
      type="button"
      {...props}
    >
      <motion.span
        animate={{ width: state === "idle" ? 0 : 16, opacity: state === "idle" ? 0 : 1 }}
        className="inline-flex overflow-hidden"
        transition={{ duration: 0.2 }}
      >
        {state === "loading" ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CheckIcon className="size-4" />
        )}
      </motion.span>
      <span>{children}</span>
    </button>
  );
}
