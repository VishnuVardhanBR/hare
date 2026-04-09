"use client";

import { FormEvent, useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadResult = {
  totalRows: number;
  createdCount: number;
  skippedDuplicates: number;
  invalidRows: number;
  errors: string[];
};

export function AdminBulkUpload() {
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

      const response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        totalRows?: number;
        createdCount?: number;
        skippedDuplicates?: number;
        invalidRows?: number;
        errors?: string[];
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Bulk upload failed.");
        return;
      }

      setResult({
        totalRows: payload.totalRows ?? 0,
        createdCount: payload.createdCount ?? 0,
        skippedDuplicates: payload.skippedDuplicates ?? 0,
        invalidRows: payload.invalidRows ?? 0,
        errors: payload.errors ?? []
      });
      setFile(null);
    } catch {
      setError("Bulk upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSV format required</CardTitle>
          <CardDescription>
            Upload a UTF-8 CSV file with this exact header order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
            company,domain,email,recruiter_name,title,department
          </pre>
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
            Google,google.com,recruiter@google.com,Jane Doe,Tech Recruiter,University Recruiting
          </pre>
          <p className="text-xs text-muted-foreground">
            Required: company, domain, email, recruiter_name. Optional: title, department.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Duplicate emails are skipped automatically. Existing companies are reused by normalized
            name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                accept=".csv,text/csv"
                id="csv-file"
                required
                type="file"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                }}
              />
              {file ? (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name}
                </p>
              ) : null}
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
                  Start bulk upload
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Total rows processed: {result.totalRows}</p>
            <p>Created: {result.createdCount}</p>
            <p>Skipped duplicates: {result.skippedDuplicates}</p>
            <p>Invalid rows: {result.invalidRows}</p>
            {result.errors.length > 0 ? (
              <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
                {result.errors.map((entry, index) => (
                  <p key={`${entry}-${index}`}>{entry}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
