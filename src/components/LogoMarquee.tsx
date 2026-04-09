"use client";

import Image from "next/image";
import { useState } from "react";

type MarqueeCompany = {
  id: string;
  name: string;
  logoUrl: string;
};

type LogoMarqueeProps = {
  companies: MarqueeCompany[];
};

function LogoItem({ company }: { company: MarqueeCompany }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    <div className="relative flex h-10 shrink-0 items-center gap-2 px-1">
      <Image
        alt={company.name}
        className="size-8 object-contain opacity-85 transition hover:opacity-100"
        height={40}
        onError={() => setFailed(true)}
        src={company.logoUrl}
        unoptimized
        width={40}
      />
      <span className="whitespace-nowrap text-sm font-medium text-slate-500">
        {company.name}
      </span>
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
      <div className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
        {track.map((company, index) => (
          <LogoItem company={company} key={`${company.id}-${index}`} />
        ))}
      </div>
    </div>
  );
}
