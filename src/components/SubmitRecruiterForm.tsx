"use client";

import { FormEvent, useEffect, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type CompanySuggestion = {
  id: string;
  name: string;
  domain?: string;
};

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
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (formData.companyName.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(formData.companyName)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const payload = (await response.json()) as {
          companies: Array<{ id: string; name: string; domain?: string }>;
        };
        setSuggestions(payload.companies ?? []);
      } catch {
        // ignore abort errors
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [formData.companyName]);

  function selectCompany(company: CompanySuggestion) {
    setFormData((current) => ({
      ...current,
      companyName: company.name,
      companyDomain: company.domain ?? current.companyDomain
    }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <form className="stack-md" onSubmit={handleSubmit}>
      <div className="field-grid" style={{ position: "relative" }}>
        <label className="field-label" htmlFor="companyName">
          Company
        </label>
        <input
          autoComplete="off"
          className="text-input"
          id="companyName"
          placeholder="Type to search existing companies..."
          required
          value={formData.companyName}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onChange={(event) => {
            setFormData((current) => ({ ...current, companyName: event.target.value }));
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {suggestions.map((company) => (
              <button
                className="autocomplete-item"
                key={company.id}
                onClick={() => selectCompany(company)}
                type="button"
              >
                {company.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field-grid">
        <label className="field-label" htmlFor="companyDomain">
          Company domain
        </label>
        <input
          className="text-input"
          id="companyDomain"
          placeholder="apple.com"
          required
          value={formData.companyDomain}
          onChange={(event) =>
            setFormData((current) => ({ ...current, companyDomain: event.target.value }))
          }
        />
      </div>

      <div className="field-grid">
        <label className="field-label" htmlFor="recruiterName">
          Recruiter name
        </label>
        <input
          className="text-input"
          id="recruiterName"
          required
          value={formData.recruiterName}
          onChange={(event) =>
            setFormData((current) => ({ ...current, recruiterName: event.target.value }))
          }
        />
      </div>

      <div className="field-grid">
        <label className="field-label" htmlFor="email">
          Work email
        </label>
        <input
          className="text-input"
          id="email"
          required
          type="email"
          value={formData.email}
          onChange={(event) =>
            setFormData((current) => ({ ...current, email: event.target.value }))
          }
        />
      </div>

      <div className="field-grid">
        <label className="field-label" htmlFor="title">
          Title
        </label>
        <input
          className="text-input"
          id="title"
          value={formData.title}
          onChange={(event) =>
            setFormData((current) => ({ ...current, title: event.target.value }))
          }
        />
      </div>

      <div className="field-grid">
        <label className="field-label" htmlFor="department">
          Department
        </label>
        <input
          className="text-input"
          id="department"
          value={formData.department}
          onChange={(event) =>
            setFormData((current) => ({ ...current, department: event.target.value }))
          }
        />
      </div>

      <button className="primary-btn" disabled={state === "submitting"} type="submit">
        {state === "submitting" ? "Submitting..." : "Submit and earn 5 credits"}
      </button>

      {message ? (
        <p className={state === "error" ? "error-text" : "success-text"}>{message}</p>
      ) : null}
    </form>
  );
}
