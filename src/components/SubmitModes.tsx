"use client";

import { useState } from "react";

import { SubmitBulkUpload } from "@/components/SubmitBulkUpload";
import { SubmitRecruiterForm } from "@/components/SubmitRecruiterForm";
import { Tabs } from "@/components/ui/tabs";

type SubmitMode = "single" | "csv";

export function SubmitModes() {
  const [mode, setMode] = useState<SubmitMode>("single");

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { title: "Single Entry", value: "single" },
          { title: "CSV Upload", value: "csv" }
        ]}
        value={mode}
        onValueChange={(value) => setMode(value as SubmitMode)}
      />

      {mode === "single" ? <SubmitRecruiterForm /> : <SubmitBulkUpload />}
    </div>
  );
}
