"use client";

import { useState } from "react";

type Tier = "10" | "25" | "50";

const TIER_LABELS: Record<Tier, string> = {
  "10": "10 credits",
  "25": "25 credits",
  "50": "50 credits"
};

export function PurchaseCredits() {
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tier: Tier) {
    setActiveTier(tier);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tier })
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to start checkout.");
    } finally {
      setActiveTier(null);
    }
  }

  return (
    <div className="stack-md">
      <div className="row-wrap">
        {(["10", "25", "50"] as const).map((tier) => (
          <button
            className="secondary-btn"
            key={tier}
            onClick={() => startCheckout(tier)}
            disabled={activeTier !== null}
            type="button"
          >
            {activeTier === tier ? "Opening..." : TIER_LABELS[tier]}
          </button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
