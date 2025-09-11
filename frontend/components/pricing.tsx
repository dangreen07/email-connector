"use client";

import { useAuth } from "@clerk/nextjs";
import { useTransition } from "react";
import Container from "./Container";
import { startCheckout } from "@/app/_actions";
import { useRouter } from "next/navigation";

type Tier = {
  name: "Basic" | "Growth" | "Scale";
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const tiersRow1: Tier[] = [
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
    cta: "Choose Pro",
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

const TierCard = (tier: Tier) => {
  const { isSignedIn } = useAuth();
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const handleClick = () => {
    if (isSignedIn) {
      // Logged in → just go to sign-up page (or dashboard billing)
      router.push(tier.href);
    } else {
      // Not logged in → run server action
      startTransition(async () => {
        try {
          const url = await startCheckout(tier.name);
          router.push(url);
        } catch (err) {
          console.error("Checkout error:", err);
        }
      });
    }
  };

  return (
    <div
      key={tier.name}
      className={`relative flex flex-col h-full max-w-sm w-full rounded-2xl border p-6 ${
        tier.highlighted
          ? "border-indigo-300/40 bg-[radial-gradient(60%_80%_at_50%_-20%,rgb(99_102_241/0.10),transparent_60%)]"
          : "border-foreground/10 bg-background"
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          Popular
        </div>
      )}
      <h3 className="text-base font-semibold">{tier.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{tier.price}</span>
        {tier.period && (
          <span className="text-sm text-foreground/70">{tier.period}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground/80">{tier.description}</p>
      <ul className="mt-4 space-y-2 text-sm text-foreground/80">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-foreground/20 text-foreground/70 inline-flex items-center justify-center">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <button
          onClick={handleClick}
          disabled={isPending}
          className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
            tier.highlighted
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "border border-foreground/20 text-foreground/90 hover:border-foreground/40"
          }`}
        >
          {isPending ? "Loading..." : tier.cta}
        </button>
      </div>
    </div>
  );
};

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24">
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
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch justify-items-center">
          {tiersRow1.map((tier) => (
            <TierCard key={tier.name} {...tier} />
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
