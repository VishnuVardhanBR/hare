"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type PopularCompany = {
  id: string;
  name: string;
  contactCount: number;
};

type CompanyResult = {
  id: string;
  name: string;
  domain: string | null;
  contactCount: number;
};

type DashboardSearchExperienceProps = {
  popularCompanies: PopularCompany[];
};

const MIN_QUERY = 2;
const MAX_POPULAR_CHIPS = 3;

export function DashboardSearchExperience({ popularCompanies }: DashboardSearchExperienceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { companies: CompanyResult[] };
        setResults(payload.companies ?? []);
      } catch {
        // Aborted or network error; keep prior results to avoid UI flicker.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const showResultsCard = trimmedQuery.length >= MIN_QUERY;
  const visiblePopularCompanies = popularCompanies.slice(0, MAX_POPULAR_CHIPS);
  const hiddenPopularCount = Math.max(popularCompanies.length - visiblePopularCompanies.length, 0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-r from-primary/15 via-sky-300/10 to-amber-200/10 blur-2xl"
        />

        <div className="relative rounded-[2.5rem] border border-white/60 bg-white/55 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <label
            className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            htmlFor="dashboard-search"
          >
            Search for companies
          </label>

          <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-inner backdrop-blur">
            <SearchIcon aria-hidden className="size-5 shrink-0 text-slate-400" />
            <input
              autoComplete="off"
              className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              id="dashboard-search"
              placeholder="Search Apple, Meta, Stripe..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {popularCompanies.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Popular
              </span>
              {visiblePopularCompanies.map((company) => (
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900"
                  key={company.id}
                  type="button"
                  onClick={() => router.push(`/company/${company.id}`)}
                >
                  <span>{company.name}</span>
                  <Badge variant="secondary">{company.contactCount}</Badge>
                </button>
              ))}
              {hiddenPopularCount > 0 ? (
                <span className="px-1 text-sm font-medium text-slate-500">and {hiddenPopularCount} more</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {showResultsCard ? (
        <div className="rounded-3xl border border-white/60 bg-white/70 p-2 shadow-xl backdrop-blur-xl">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : null}

          {!loading && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No companies found for &quot;{trimmedQuery}&quot;.
            </p>
          ) : null}

          {!loading && results.length > 0 ? (
            <ul className="divide-y divide-slate-200/60">
              {results.map((company) => (
                <li key={company.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-white/80"
                    type="button"
                    onClick={() => router.push(`/company/${company.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{company.name}</p>
                      {company.domain ? (
                        <p className="truncate text-xs text-slate-500">{company.domain}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary">{company.contactCount}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
