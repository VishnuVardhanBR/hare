"use client";

import Image from "next/image";
import { useState } from "react";

type MarqueeCompany = {
  id: string;
  name: string;
  domain: string | null;
};

type LogoMarqueeProps = {
  companies: MarqueeCompany[];
};

function LogoItem({ company }: { company: MarqueeCompany }) {
  const [failed, setFailed] = useState(false);

  if (!company.domain || failed) {
    return (
      <span className="shrink-0 whitespace-nowrap text-sm font-medium text-slate-400">
        {company.name}
      </span>
    );
  }

  return (
    <div className="relative flex h-10 w-28 shrink-0 items-center justify-center">
      <Image
        alt=""
        className="max-h-10 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
        height={40}
        onError={() => setFailed(true)}
        src={`https://logo.clearbit.com/${company.domain}`}
        unoptimized
        width={112}
      />
    </div>
  );
}

export function LogoMarquee({ companies }: LogoMarqueeProps) {
  if (companies.length === 0) {
    return null;
  }

  const track = [...companies, ...companies];

  return (
    <div
      aria-hidden
      className="relative w-full overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      <div className="flex w-max animate-marquee items-center gap-12 hover:[animation-play-state:paused]">
        {track.map((company, index) => (
          <LogoItem company={company} key={`${company.id}-${index}`} />
        ))}
      </div>
    </div>
  );
}
