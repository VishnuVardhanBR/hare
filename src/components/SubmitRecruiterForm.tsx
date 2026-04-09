"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2Icon, Loader2Icon, TriangleAlertIcon } from "lucide-react";

import {
  CompanySearchCombobox,
  type CompanySearchResult
} from "@/components/CompanySearchCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubmitState = "idle" | "submitting" | "success" | "error";

const INITIAL_FORM = {
  companyName: "",
  companyDomain: "",
  email: "",
  recruiterName: "",
  title: "",
  department: ""
};

export function SubmitRecruiterForm() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleCompanySelect(company: CompanySearchResult) {
    setFormData((current) => ({
      ...current,
      companyName: company.name,
      companyDomain: company.domain ?? current.companyDomain
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      formData.companyName.trim().length < 2 ||
      formData.companyDomain.trim().length < 3 ||
      formData.recruiterName.trim().length < 2 ||
      formData.email.trim().length < 3
    ) {
      setState("error");
      setMessage("Please complete all required fields.");
      return;
    }

    setState("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        verification?: string;
        creditsEarned?: number;
      };

      if (!response.ok || !payload.ok) {
        setState("error");
        setMessage(payload.error ?? "Submission failed.");
        return;
      }

      setState("success");
      setMessage(
        `Email verified. +${payload.creditsEarned ?? 5} credits awarded. ${payload.verification ?? ""}`
      );
      setFormData(INITIAL_FORM);
    } catch {
      setState("error");
      setMessage("Submission failed.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="company-combobox">Company</Label>
        <CompanySearchCombobox
          id="company-combobox"
          onSelect={handleCompanySelect}
          onValueChange={(value) =>
            setFormData((current) => ({
              ...current,
              companyName: value
            }))
          }
          placeholder="Type to search existing companies..."
          value={formData.companyName}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyDomain">Company domain</Label>
          <Input
            id="companyDomain"
            placeholder="apple.com"
            required
            value={formData.companyDomain}
            onChange={(event) =>
              setFormData((current) => ({ ...current, companyDomain: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recruiterName">Recruiter name</Label>
          <Input
            id="recruiterName"
            required
            value={formData.recruiterName}
            onChange={(event) =>
              setFormData((current) => ({ ...current, recruiterName: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          required
          type="email"
          value={formData.email}
          onChange={(event) =>
            setFormData((current) => ({ ...current, email: event.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(event) =>
              setFormData((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(event) =>
              setFormData((current) => ({ ...current, department: event.target.value }))
            }
          />
        </div>
      </div>

      <Button disabled={state === "submitting"} type="submit">
        {state === "submitting" ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit and earn 5 credits"
        )}
      </Button>

      {message ? (
        <Alert variant={state === "error" ? "destructive" : "default"}>
          {state === "error" ? <TriangleAlertIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
          <AlertTitle>{state === "error" ? "Submission error" : "Submission successful"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
