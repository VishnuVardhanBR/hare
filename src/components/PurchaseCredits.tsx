"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type Tier = "10" | "25" | "50";

const TIER_DETAILS: Record<Tier, { credits: string; price: string }> = {
  "10": { credits: "10 credits", price: "$3" },
  "25": { credits: "25 credits", price: "$5" },
  "50": { credits: "50 credits", price: "$8" }
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["10", "25", "50"] as const).map((tier) => (
          <Card className="border-slate-200" key={tier}>
            <CardContent className="space-y-2 pt-6 text-center">
              <p className="text-2xl font-bold">{TIER_DETAILS[tier].credits}</p>
              <p className="text-sm text-muted-foreground">{TIER_DETAILS[tier].price}</p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={activeTier !== null}
                onClick={() => startCheckout(tier)}
                type="button"
              >
                {activeTier === tier ? "Opening..." : "Buy"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
