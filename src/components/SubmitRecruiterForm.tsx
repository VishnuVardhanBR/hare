"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";

import {
  CompanySearchCombobox,
  type CompanySearchResult
} from "@/components/CompanySearchCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatefulButton } from "@/components/ui/stateful-button";
import { getDomainFromEmail, sanitizeDomain } from "@/lib/company";

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
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [domainWasEdited, setDomainWasEdited] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleCompanySelect(company: CompanySearchResult) {
    setSelectedCompany(company);
    setFormData((current) => ({
      ...current,
      companyName: company.name,
      companyDomain: current.companyDomain.trim() ? current.companyDomain : (company.domain ?? "")
    }));
  }

  function handleCompanyValueChange(value: string) {
    const matchesSelectedCompany =
      !!selectedCompany &&
      value.trim().toLowerCase() === selectedCompany.name.trim().toLowerCase();

    setFormData((current) => {
      const selectedDomain = selectedCompany?.domain ?? "";
      const shouldClearLockedDomain =
        !!selectedCompany &&
        !matchesSelectedCompany &&
        !!selectedDomain &&
        current.companyDomain === selectedDomain;

      return {
        ...current,
        companyName: value,
        companyDomain: shouldClearLockedDomain ? "" : current.companyDomain
      };
    });

    if (selectedCompany && !matchesSelectedCompany) {
      setSelectedCompany(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      formData.companyName.trim().length < 2 ||
      formData.recruiterName.trim().length < 2 ||
      formData.email.trim().length < 3
    ) {
      setState("error");
      setMessage("Complete required fields: work email, recruiter name, and company name.");
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
      const creditsEarned = payload.creditsEarned ?? 5;
      const verificationNote = payload.verification?.trim();
      setMessage(
        verificationNote
          ? `+${creditsEarned} credits awarded. ${verificationNote}`
          : `+${creditsEarned} credits awarded.`
      );
      setSelectedCompany(null);
      setDomainWasEdited(false);
      setFormData(INITIAL_FORM);
    } catch {
      setState("error");
      setMessage("Submission failed. Please try again.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Work email *</Label>
          <Input
            id="email"
            required
            type="email"
            value={formData.email}
            onChange={(event) => {
              const nextEmail = event.target.value;
              setFormData((current) => {
                const inferredDomain = sanitizeDomain(getDomainFromEmail(nextEmail.trim().toLowerCase()));
                const shouldAutoFillDomain = !domainWasEdited || !current.companyDomain.trim();
                return {
                  ...current,
                  email: nextEmail,
                  companyDomain:
                    shouldAutoFillDomain && inferredDomain ? inferredDomain : current.companyDomain
                };
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recruiterName">Recruiter name *</Label>
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
        <Label htmlFor="company-input">Company name *</Label>
        <CompanySearchCombobox
          id="company-input"
          onSelect={handleCompanySelect}
          onValueChange={handleCompanyValueChange}
          placeholder="Type to search existing companies..."
          required
          value={formData.companyName}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(event) =>
              setFormData((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department (optional)</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(event) =>
              setFormData((current) => ({ ...current, department: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyDomain">Company domain</Label>
        <Input
          id="companyDomain"
          placeholder="apple.com"
          value={formData.companyDomain}
          onChange={(event) => {
            setDomainWasEdited(true);
            setFormData((current) => ({ ...current, companyDomain: event.target.value }));
          }}
        />
      </div>

      <StatefulButton
        className="w-full border-primary bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:min-w-56"
        state={state === "submitting" ? "loading" : state === "success" ? "success" : "idle"}
        type="submit"
      >
        {state === "submitting" ? "Submitting..." : "Submit and earn 5 credits"}
      </StatefulButton>

      {message ? (
        <Alert className="py-3" variant={state === "error" ? "destructive" : "default"}>
          {state === "error" ? <TriangleAlertIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
          <AlertTitle>{state === "error" ? "Submission error" : "Submitted"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
