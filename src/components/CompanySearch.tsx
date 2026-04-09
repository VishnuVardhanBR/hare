"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CompanySearchCombobox,
  type CompanySearchResult
} from "@/components/CompanySearchCombobox";

type CompanySearchProps = {
  defaultQuery?: string;
};

export function CompanySearch({ defaultQuery = "" }: CompanySearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  function handleSelect(company: CompanySearchResult) {
    router.push(`/company/${company.id}`);
  }

  return (
    <div className="space-y-3">
      <CompanySearchCombobox
        allowCustomValue={false}
        emptyMessage="No companies found."
        onSelect={handleSelect}
        onValueChange={setQuery}
        placeholder="Type Apple, Meta, Stripe..."
        showContactCount
        value={query}
      />
      <p className="text-xs text-muted-foreground">Search and select a company to open contacts.</p>
    </div>
  );
}
