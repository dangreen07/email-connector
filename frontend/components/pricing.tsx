"use client";

import { Tier } from "@/utils/types";
import Container from "./Container";
import { TierCard } from "./TierCard";

const tiersRow1: Tier[] = [
  {
    name: "Free" as const,
    price: "$0",
    period: "",
    description: "For development & testing.",
    features: [
      "Unlimited projects",
      "1 inbox included",
      "50k API calls included",
      "100 MB egress included",
      "No credit card required",
    ],
    cta: "Start for Free",
    href: "/sign-up",
  },
  {
    name: "Basic" as const,
    price: "$19",
    period: "/mo",
    description: "For indie hackers & small apps.",
    features: [
      "50 inboxes included",
      "500k API calls included",
      "2 GB egress included",
      "$0.25 per extra inbox",
      "$0.40 per 100k extra API calls",
    ],
    cta: "Choose Basic",
    href: "/sign-up",
  },
  {
    name: "Growth" as const,
    price: "$200",
    period: "/mo",
    description: "Perfect for growing SaaS products.",
    features: [
      "1,000 inboxes included",
      "5M API calls included",
      "25 GB egress included",
      "$0.22 per extra inbox",
      "$0.35 per 100k extra API calls",
    ],
    cta: "Get Growth",
    href: "/sign-up",
  },
  {
    name: "Scale" as const,
    price: "$999",
    period: "/mo",
    description: "For apps with thousands of users.",
    features: [
      "5,000 inboxes included",
      "20M API calls included",
      "100 GB egress included",
      "$0.20 per extra inbox",
      "$0.30 per 100k extra API calls",
    ],
    cta: "Go Scale",
    href: "/sign-up",
  },
];

export default function Pricing({
  plan,
  isAuthenticated,
}: {
  plan: "Free" | "Basic" | "Growth" | "Scale";
  isAuthenticated: boolean;
}) {
  return (
    <section id="pricing" className="py-8 sm:py-12">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Fair, inbox-based pricing
          </h2>
          <p className="mt-3 text-foreground/80">
            Only pay for active inbox connections. Development is always free.
            No enterprise markups — just simple, transparent pricing.
          </p>
        </div>

        {/* Row 1: 3 cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch justify-items-center">
          {tiersRow1.map((tier) => (
            <TierCard
              key={tier.name}
              tier={tier}
              plan={plan}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {/* Enterprise Section */}
        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-foreground/10 bg-muted/30 p-8 text-center">
          <h3 className="text-xl font-semibold">Enterprise</h3>
          <p className="mt-2 text-sm text-foreground/80">
            For organizations with more than 20,000 inboxes or advanced
            compliance needs (SLA, SSO, HIPAA/BAA, EU region hosting).
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/80 text-left mx-auto max-w-md">
            <li>Unlimited inboxes with volume discounts</li>
            <li>SOC 2, HIPAA, and GDPR compliance support</li>
            <li>Dedicated onboarding & technical account manager</li>
            <li>Custom contracts & SLAs</li>
          </ul>
          <div className="mt-6">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Contact Sales
            </a>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-foreground/70">
          Pricing is per active inbox connection, with transparent overages for
          API calls and attachment bandwidth. Dev/sandbox mode is always free.
          All plans include unlimited projects, Gmail, Outlook, and any
          IMAP/SMTP provider.
        </p>
      </Container>
    </section>
  );
}
