"use client";

import type { ComponentPropsWithoutRef } from "react";
import { CarrotIcon } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

type PrimitiveBaseProps = {
  asChild?: boolean;
  className?: string;
};

type ActionProps = PrimitiveBaseProps & {
  active?: boolean;
};

function creditLabel(credits: number) {
  return credits === 1 ? "1 credit" : `${credits} credits`;
}

export function NavPrimaryPill({
  asChild = false,
  active = false,
  className,
  ...props
}: ActionProps & ComponentPropsWithoutRef<"button">) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3.5 text-sm font-medium text-slate-700 shadow-inner backdrop-blur transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active &&
          "bg-primary text-primary-foreground shadow-[0_10px_25px_-15px_rgba(30,64,175,0.85)] ring-2 ring-primary/20 hover:bg-primary/90 hover:text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}

export function NavTextLink({
  asChild = false,
  active = false,
  className,
  ...props
}: ActionProps & ComponentPropsWithoutRef<"button">) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-9 items-center rounded-md px-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        active && "text-slate-900",
        className
      )}
      {...props}
    />
  );
}

export function NavGhostButton({
  asChild = false,
  className,
  ...props
}: PrimitiveBaseProps & ComponentPropsWithoutRef<"button">) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/70 px-2.5 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function NavCreditPill({
  credits,
  unlimited = false,
  className
}: {
  credits: number;
  unlimited?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/75 px-3 text-sm font-semibold text-amber-800 shadow-sm backdrop-blur",
        className
      )}
    >
      <CarrotIcon className="size-3.5" />
      {unlimited ? "Unlimited credits" : creditLabel(credits)}
    </span>
  );
}
