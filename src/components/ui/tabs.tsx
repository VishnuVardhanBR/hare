"use client";

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
        "inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/60 p-1 shadow-sm backdrop-blur",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900",
              isActive && "border border-white/70 bg-white/85 text-slate-900 shadow-sm"
            )}
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            type="button"
          >
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}
