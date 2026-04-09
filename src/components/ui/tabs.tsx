"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export type TabItem = {
  title: string;
  value: string;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-muted/30 p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "text-foreground"
            )}
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            type="button"
          >
            {isActive ? (
              <motion.span
                className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                layoutId="active-tab-pill"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            ) : null}
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}
