"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type CompanyLogoBadgeProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: {
    container: "size-8 rounded-xl",
    image: 24,
    text: "text-xs"
  },
  md: {
    container: "size-10 rounded-2xl",
    image: 28,
    text: "text-sm"
  },
  lg: {
    container: "size-14 rounded-[1.25rem]",
    image: 40,
    text: "text-lg"
  }
} as const;

export function CompanyLogoBadge({
  name,
  logoUrl,
  size = "md",
  className
}: CompanyLogoBadgeProps) {
  const [failed, setFailed] = useState(false);
  const config = SIZE_MAP[size];

  const fallbackLabel = useMemo(() => {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("") || "H"
    );
  }, [name]);

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-white/70 bg-white/80 text-slate-700 shadow-inner backdrop-blur",
        config.container,
        className
      )}
    >
      {!failed && logoUrl ? (
        <Image
          alt={`${name} logo`}
          className="object-contain"
          height={config.image}
          src={logoUrl}
          unoptimized
          width={config.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cn("font-semibold tracking-tight", config.text)}>{fallbackLabel}</span>
      )}
    </div>
  );
}
