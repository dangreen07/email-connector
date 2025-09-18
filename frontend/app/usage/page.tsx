import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ManageBillingButton from "@/components/manage-billing-button";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/* Helper for number & currency formatting (locale aware) */
function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}
function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function calcProgress(used: number, included: number) {
  if (included === 0) return 100;
  const pct = Math.min(100, Math.round((used / Math.max(1, included)) * 100));
  return pct;
}

export default async function UsagePage() {
  const user = await currentUser();
  if (!user) {
    return redirect("/sign-in");
  }
  const result = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}/usage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_KEY}`,
      },
      body: JSON.stringify({
        userId: user.id,
      }),
    }
  );
  const usage = await result.json();

  if (!usage) {
    return (
      <div className="flex flex-col flex-grow justify-center items-center">
        Loading...
      </div>
    );
  }

  // Inboxes (charged per inbox, not "active" logic here)
  const inboxesUsed = usage.inboxesUsed ?? 0; // connected inbox count
  const inboxesIncluded = usage.inboxesIncluded ?? 0;
  const inboxPct = calcProgress(inboxesUsed, inboxesIncluded);
  const inboxOverageCount = Math.max(0, inboxesUsed - inboxesIncluded);
  const inboxOveragePrice = usage.inboxOveragePrice ?? 0.25; // USD per inbox

  // API calls (billed per-call for calculation purposes)
  const apiUsed = usage.apiCallsUsed ?? 0;
  const apiIncluded = usage.apiCallsIncluded ?? 0;
  const apiOverageCalls = Math.max(0, apiUsed - apiIncluded);

  // Display price granularity (per 100k on pricing) but calculate per-call
  const defaultApiPricePer100k = 0.4; // fallback $0.40 per 100k
  const apiPricePer100k =
    usage.apiOveragePricePer100k ?? defaultApiPricePer100k;
  const apiPricePerCall = apiPricePer100k / 100_000;
  const apiOverage100kUnits = Math.ceil(apiOverageCalls / 100_000);
  const apiOverageCharge = apiOverageCalls * apiPricePerCall;

  const inboxOverageCharge = inboxOverageCount * inboxOveragePrice;
  const totalEstimatedOverage = inboxOverageCharge + apiOverageCharge;

  const currency = "USD";

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-sm text-muted-foreground">
            Current billing period: {usage.periodStart} — {usage.periodEnd}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary">{usage.planName ?? "Current plan"}</Badge>
          <ManageBillingButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inboxes card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Inboxes</span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(inboxesUsed)} / {formatNumber(inboxesIncluded)}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  Connected inboxes
                </div>
                <div className="text-lg font-semibold">
                  {formatNumber(inboxesUsed)}
                </div>
              </div>

              <div className="text-right">
                {inboxesUsed > inboxesIncluded ? (
                  <Badge
                    variant="destructive"
                    className="inline-flex items-center gap-2"
                  >
                    <ArrowUp className="w-4 h-4" />
                    {formatNumber(inboxesUsed - inboxesIncluded)} over
                  </Badge>
                ) : (
                  <Badge>Included</Badge>
                )}
              </div>
            </div>

            <Progress value={inboxPct} />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>{inboxPct}% of included inboxes used</div>
              <div>{formatNumber(inboxesIncluded)} included</div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Overage:{" "}
                <strong>{formatCurrency(inboxOveragePrice, currency)}</strong>{" "}
                per extra inbox / month
              </div>
              <div className="text-sm font-medium">
                {inboxOverageCount > 0 ? (
                  <span>
                    {formatNumber(inboxOverageCount)} ×{" "}
                    {formatCurrency(inboxOveragePrice, currency)} ={" "}
                    <strong>
                      {formatCurrency(inboxOverageCharge, currency)}
                    </strong>
                  </span>
                ) : (
                  <span className="text-muted-foreground">No overage</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Calls card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>API calls</span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(apiUsed)} / {formatNumber(apiIncluded)}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  API calls this period
                </div>
                <div className="text-lg font-semibold">
                  {formatNumber(apiUsed)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Billable calls
                </div>
                <div className="font-medium">
                  {formatNumber(apiOverageCalls)}
                </div>
              </div>
            </div>

            <Progress value={calcProgress(apiUsed, apiIncluded)} />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                {apiOverageCalls > 0 ? (
                  `${formatNumber(apiOverageCalls)} calls billable`
                ) : (
                  <>No API overage</>
                )}
              </div>
              <div>
                {apiOverageCalls > 0 ? (
                  formatCurrency(apiOverageCharge, currency)
                ) : (
                  <span className="text-muted-foreground">Included</span>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Overage price shown:{" "}
                <strong>
                  {formatCurrency(apiPricePer100k, currency)} per 100k calls
                </strong>
                <div className="text-xs text-muted-foreground mt-1">
                  (Estimate calculated per API call for accuracy)
                </div>
              </div>

              <div className="text-sm font-medium text-right">
                {apiOverageCalls > 0 ? (
                  <>
                    <div>
                      {formatNumber(apiOverage100kUnits)} ×{" "}
                      {formatCurrency(apiPricePer100k, currency)}
                    </div>
                    <div className="mt-1">
                      {formatCurrency(apiOverageCharge, currency)} estimated
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">No charge</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimated total overage row */}
      <div className="mt-6 rounded-lg border p-4 flex items-center justify-between bg-white dark:bg-slate-900">
        <div>
          <div className="text-sm text-muted-foreground">
            Estimated overage this period
          </div>
          <div className="text-2xl font-semibold">
            {totalEstimatedOverage > 0 ? (
              formatCurrency(totalEstimatedOverage, currency)
            ) : (
              <span className="text-muted-foreground">$0.00</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            This is an estimate. Final charges appear on your invoice.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ManageBillingButton />
        </div>
      </div>
    </div>
  );
}
