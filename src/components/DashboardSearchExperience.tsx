"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { CompanyLogoBadge } from "@/components/CompanyLogoBadge";
import { resolveCompanyLogoUrl } from "@/components/logoMarqueeUtils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AMBIENT_GLOW_CLASS,
  GLASS_CHIP_CLASS,
  NESTED_GLASS_PILL_CLASS,
  PRIMARY_GLASS_SURFACE_CLASS
} from "@/lib/uiClasses";

type PopularCompany = {
  id: string;
  name: string;
  contactCount: number;
};

type CompanyResult = {
  id: string;
  name: string;
  domain: string | null;
  logoUrl?: string | null;
  contactCount: number;
};

type DashboardSearchExperienceProps = {
  allCompanies: CompanyResult[];
  popularCompanies: PopularCompany[];
};

const MIN_QUERY = 2;
const MAX_POPULAR_CHIPS = 3;

export function DashboardSearchExperience({
  allCompanies,
  popularCompanies
}: DashboardSearchExperienceProps) {
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
    setLoading(true);
    const timeoutId = setTimeout(async () => {
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
  const showSearchResults = trimmedQuery.length >= MIN_QUERY;
  const visiblePopularCompanies = popularCompanies.slice(0, MAX_POPULAR_CHIPS);
  const hasHiddenPopularCompanies = popularCompanies.length > visiblePopularCompanies.length;
  const visibleCompanies = showSearchResults ? results : allCompanies;
  const companySectionLabel = showSearchResults ? "Search results" : "All companies";
  const companySectionDescription = showSearchResults
    ? `Browse matches for "${trimmedQuery}".`
    : "Browse every company in Hare.";

  return (
    <div className="space-y-6">
      <div className="relative">
        <div aria-hidden className={AMBIENT_GLOW_CLASS} />

        <div className={`relative p-6 sm:p-8 ${PRIMARY_GLASS_SURFACE_CLASS}`}>
          <label
            className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            htmlFor="dashboard-search"
          >
            Search for companies
          </label>

          <div className={`flex items-center gap-3 px-5 py-3 ${NESTED_GLASS_PILL_CLASS}`}>
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
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900 ${GLASS_CHIP_CLASS}`}
                  key={company.id}
                  type="button"
                  onClick={() => router.push(`/company/${company.id}`)}
                >
                  <span>{company.name}</span>
                  <Badge variant="secondary">{company.contactCount}</Badge>
                </button>
              ))}
              {hasHiddenPopularCompanies ? (
                <span className="px-1 text-sm font-medium text-slate-500">and more</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {allCompanies.length > 0 || showSearchResults ? (
        <div className={`p-2 ${PRIMARY_GLASS_SURFACE_CLASS}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {companySectionLabel}
              </p>
              <p className="text-sm text-slate-500">{companySectionDescription}</p>
            </div>
            <Badge className="h-6 px-2.5" variant="secondary">
              {visibleCompanies.length}
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : null}

          {!loading && visibleCompanies.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No companies found for &quot;{trimmedQuery}&quot;.
            </p>
          ) : null}

          {!loading && visibleCompanies.length > 0 ? (
            <div className="max-h-[38rem] overflow-y-auto px-1 pb-1">
              <ul className="grid gap-2 sm:grid-cols-2">
                {visibleCompanies.map((company) => (
                  <li key={company.id}>
                    <button
                      className="flex h-full w-full items-center justify-between gap-3 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:bg-white/85"
                      type="button"
                      onClick={() => router.push(`/company/${company.id}`)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CompanyLogoBadge
                          logoUrl={resolveCompanyLogoUrl(
                            company,
                            process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
                          )}
                          name={company.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {company.name}
                          </p>
                          {company.domain ? (
                            <p className="truncate text-xs text-slate-500">{company.domain}</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="secondary">{company.contactCount}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
