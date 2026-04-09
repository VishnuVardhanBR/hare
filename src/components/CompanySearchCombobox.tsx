"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type CompanySearchResult = {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string | null;
  contactCount?: number;
};

type CompanySearchComboboxProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (company: CompanySearchResult) => void;
  placeholder?: string;
  emptyMessage?: string;
  minQueryLength?: number;
  className?: string;
  disabled?: boolean;
  showContactCount?: boolean;
  required?: boolean;
  allowCustomValue?: boolean;
};

export function CompanySearchCombobox({
  id,
  value,
  onValueChange,
  onSelect,
  placeholder = "Search companies...",
  emptyMessage = "No companies found.",
  minQueryLength = 2,
  className,
  disabled = false,
  showContactCount = false,
  required = false,
  allowCustomValue = true
}: CompanySearchComboboxProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
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
  }, [query, minQueryLength]);

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    onValueChange(nextValue);
  }

  function selectCompany(company: CompanySearchResult) {
    onSelect(company);
    onValueChange(company.name);
    setQuery(company.name);
    setResults([]);
  }

  const trimmedQuery = query.trim();
  const showSuggestions = trimmedQuery.length > 0;
  const showCreateOption = useMemo(() => {
    if (!allowCustomValue || trimmedQuery.length < minQueryLength || results.length > 0) {
      return false;
    }

    return true;
  }, [allowCustomValue, minQueryLength, results.length, trimmedQuery.length]);

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        required={required}
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
      />

      {showSuggestions ? (
        <div className="overflow-hidden rounded-md border bg-background">
          {loading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : null}

          {!loading && trimmedQuery.length < minQueryLength ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Type at least {minQueryLength} characters.
            </p>
          ) : null}

          {!loading && trimmedQuery.length >= minQueryLength && results.length > 0 ? (
            <ul className="divide-y">
              {results.map((company) => (
                <li key={company.id}>
                  <button
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    type="button"
                    onClick={() => selectCompany(company)}
                  >
                    <span className="truncate font-medium">{company.name}</span>
                    {showContactCount ? (
                      <Badge className="shrink-0" variant="secondary">
                        {company.contactCount ?? 0}
                      </Badge>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && trimmedQuery.length >= minQueryLength && results.length === 0 ? (
            <div className="space-y-1 p-2">
              <p className="px-1 py-1 text-sm text-muted-foreground">{emptyMessage}</p>
              {showCreateOption ? (
                <button
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                  type="button"
                  onClick={() => {
                    onValueChange(trimmedQuery);
                    setQuery(trimmedQuery);
                  }}
                >
                  Use &quot;{trimmedQuery}&quot;
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
