// components/manage-billing-button.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateCustomerPortal } from "@/utils/stripe/actions";

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      // CreateCustomerPortal is a Next.js server action (runs server-side).
      // It should return a portal URL string or undefined.
      const url = await CreateCustomerPortal();
      if (!url) {
        throw new Error("No billing portal URL available.");
      }
      // Redirect the browser to Stripe's customer portal
      window.location.href = url;
    } catch (err: unknown) {
      console.error("CreateCustomerPortal error", err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading} size="sm">
        {loading ? "Opening…" : "Manage billing"}
      </Button>
      {error ? (
        <div className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
