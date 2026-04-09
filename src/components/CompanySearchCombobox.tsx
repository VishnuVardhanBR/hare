"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  showContactCount = false
}: CompanySearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setResults([]);
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
  }, [open, query, minQueryLength]);

  const triggerLabel = useMemo(() => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : placeholder;
  }, [value, placeholder]);

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    onValueChange(nextValue);
  }

  function selectCompany(company: CompanySearchResult) {
    onSelect(company);
    onValueChange(company.name);
    setQuery(company.name);
    setOpen(false);
  }

  const showCreateOption = query.trim().length >= minQueryLength;
  const commandEmptyMessage =
    query.trim().length < minQueryLength
      ? `Type at least ${minQueryLength} characters.`
      : emptyMessage;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : null}

            {!loading ? <CommandEmpty>{commandEmptyMessage}</CommandEmpty> : null}

            {!loading && results.length > 0 ? (
              <CommandGroup>
                {results.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={`${company.name} ${company.domain ?? ""}`}
                    onSelect={() => selectCompany(company)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-medium">{company.name}</span>
                      {showContactCount ? (
                        <Badge className="shrink-0" variant="secondary">
                          {company.contactCount ?? 0}
                        </Badge>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {!loading && results.length === 0 && showCreateOption ? (
              <CommandGroup>
                <CommandItem
                  value={query}
                  onSelect={() => {
                    const trimmed = query.trim();
                    onValueChange(trimmed);
                    setQuery(trimmed);
                    setOpen(false);
                  }}
                >
                  Use &quot;{query.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
