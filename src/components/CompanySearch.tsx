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
    <div>
      <CompanySearchCombobox
        allowCustomValue={false}
        emptyMessage="No companies found."
        inputVariant="vanish"
        onSelect={handleSelect}
        onValueChange={setQuery}
        placeholder="Search recruiter contacts..."
        placeholders={[
          "Search Apple, Meta, Stripe...",
          "Try Amazon or Google...",
          "Find new grad recruiting contacts..."
        ]}
        showContactCount
        value={query}
      />
    </div>
  );
}
