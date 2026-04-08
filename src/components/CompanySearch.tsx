"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CompanySearchResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  contactCount: number;
};

type CompanySearchProps = {
  defaultQuery?: string;
};

export function CompanySearch({ defaultQuery = "" }: CompanySearchProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { companies: CompanySearchResult[] };
        setResults(payload.companies ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <div className="stack-lg">
      <label className="field-label" htmlFor="company-search">
        Search company
      </label>
      <input
        id="company-search"
        className="text-input"
        placeholder="Type Apple, Meta, Stripe..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading ? <p className="muted">Searching...</p> : null}

      {!loading && query.trim().length >= 2 ? (
        <div className="list">
          {results.length === 0 ? (
            <p className="muted">No companies found.</p>
          ) : (
            results.map((company) => (
              <Link className="list-item" href={`/company/${company.id}`} key={company.id}>
                <div>
                  <p className="row-title">{company.name}</p>
                  <p className="muted">{company.contactCount} recruiter contacts</p>
                </div>
                <span className="cta-inline">Open</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
