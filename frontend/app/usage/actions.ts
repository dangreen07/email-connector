"use server";

export type Usage = {
  // Billing period
  periodStart: string; // ISO
  periodEnd: string; // ISO

  // Plan info
  planName?: string;
  currency?: string;

  // Inboxes
  inboxesUsed: number;
  inboxesIncluded: number;
  inboxOveragePrice?: number; // USD per inbox

  // API calls
  apiCallsUsed: number; // raw calls this period
  apiCallsIncluded: number; // raw calls included in plan
  apiCallBillingUnit: number; // billing unit (e.g. 100000 for 100k)
  apiOveragePricePerUnit?: number; // USD per billing unit
  apiOveragePricePer100k?: number; // USD per 100k calls (legacy / alternate)
  apiReportedUnits?: number; // units already reported to Stripe (optional)
};

export async function fetchUsage(): Promise<Usage> {
  // TODO: Implement this with real data
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // start of month
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    planName: "Basic",
    currency: "USD",

    // Inboxes: show a small overage example (63 used vs 50 included)
    inboxesUsed: 10_000,
    inboxesIncluded: 50,
    inboxOveragePrice: 0.25, // $0.25 per extra inbox / month

    // API calls: show an overage example (600k used vs 500k included)
    apiCallsUsed: 50_000_000,
    apiCallsIncluded: 500_000,
    apiCallBillingUnit: 100_000, // bill in 100k increments (matches pricing ui)
    apiOveragePricePer100k: 0.4, // $0.40 per 100k calls (Basic)
    apiReportedUnits: 1, // example: 1 unit previously reported (100k)
  };
}
