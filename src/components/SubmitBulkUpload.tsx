"use client";

import { FormEvent, useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadResult = {
  totalRows: number;
  createdCount: number;
  creditsEarned: number;
  skippedDuplicates: number;
  skippedInFileDuplicates: number;
  invalidRows: number;
  errors: string[];
};

export function SubmitBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/bulk-upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        totalRows?: number;
        createdCount?: number;
        creditsEarned?: number;
        skippedDuplicates?: number;
        skippedInFileDuplicates?: number;
        invalidRows?: number;
        errors?: string[];
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "CSV upload failed.");
        return;
      }

      setResult({
        totalRows: payload.totalRows ?? 0,
        createdCount: payload.createdCount ?? 0,
        creditsEarned: payload.creditsEarned ?? 0,
        skippedDuplicates: payload.skippedDuplicates ?? 0,
        skippedInFileDuplicates: payload.skippedInFileDuplicates ?? 0,
        invalidRows: payload.invalidRows ?? 0,
        errors: payload.errors ?? []
      });
      setFile(null);
    } catch {
      setError("CSV upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-foreground">CSV format</p>
        <pre className="overflow-x-auto rounded-md border bg-background p-2 text-xs">
          company,domain,email,recruiter_name,title,department
        </pre>
        <p className="text-xs text-muted-foreground">
          Max 50 rows per upload. Verified unique rows earn 5 credits each.
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="bulk-csv-file">CSV file</Label>
          <Input
            accept=".csv,text/csv"
            id="bulk-csv-file"
            required
            type="file"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
            }}
          />
          {file ? <p className="text-xs text-muted-foreground">Selected: {file.name}</p> : null}
        </div>

        <Button disabled={loading} type="submit">
          {loading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="size-4" />
              Upload CSV
            </>
          )}
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <div className="space-y-2 rounded-xl border bg-background p-4 text-sm">
          <p className="font-medium">Upload result</p>
          <p>Total rows: {result.totalRows}</p>
          <p>Created: {result.createdCount}</p>
          <p>Credits earned: +{result.creditsEarned}</p>
          <p>Skipped duplicates (already in DB): {result.skippedDuplicates}</p>
          <p>Skipped duplicates (same file): {result.skippedInFileDuplicates}</p>
          <p>Invalid/failed rows: {result.invalidRows}</p>
          {result.errors.length > 0 ? (
            <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
              {result.errors.map((entry, index) => (
                <p key={`${entry}-${index}`}>{entry}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
