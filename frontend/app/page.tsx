import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Pricing from "@/components/pricing";
import db from "@/utils/db";
import { subscriptions, users } from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Image from "next/image";

export const metadata: Metadata = {
  title: "MailLink - One API for all Providers.",
  description:
    "One API for Gmail, Outlook, and IMAP/SMTP. Free development and unlimited dev environments. Zero provider config in development; configure at production.",
  keywords: [
    "email api",
    "free development environments",
    "unlimited dev environments",
    "zero config in development",
    "gmail outlook imap smtp",
    "instant dev environments",
    "faster developer onboarding",
  ],
  openGraph: {
    title: "MailLink - One API for all Providers.",
    description:
      "One API for Gmail, Outlook, and IMAP/SMTP. Zero provider configuration in development. Configure providers only at production.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MailLink - One API for all Providers.",
    description:
      "Zero provider config in development. Unlimited dev environments. Configure providers only at production.",
  },
};

export default async function Home() {
  const { userId, isAuthenticated } = await auth();
  let plan: "Basic" | "Growth" | "Scale" | null = null;
  if (userId) {
    const currentSubscription = await db
      .select({
        subscriptions,
      })
      .from(subscriptions)
      .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
      .where(eq(users.clerkUserId, userId))
      .then((val) => val.at(0)?.subscriptions ?? null);
    const productId = currentSubscription?.productId;
    if (productId) {
      if (productId == process.env.STRIPE_BASIC_PRODUCT) {
        plan = "Basic";
      } else if (productId == process.env.STRIPE_GROWTH_PRODUCT) {
        plan = "Growth";
      } else if (productId == process.env.STRIPE_SCALE_PRODUCT) {
        plan = "Scale";
      }
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgb(99_102_241/0.15),transparent_60%)]"></div>
        <Container className="pt-20 pb-16 sm:pt-24 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-500">
              One API for Gmail, Outlook, and IMAP/SMTP
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              One API for every inbox
            </h1>
            <p className="mt-4 text-lg text-foreground/80">
              Prebuilt OAuth flows, unified JSON and webhooks, get from zero to
              inbox in one afternoon.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-up"}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              >
                Start free
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md border border-foreground/20 px-5 py-3 text-sm font-medium text-foreground/90 hover:border-foreground/40"
              >
                Read the docs
              </Link>
            </div>
            <p className="mt-3 text-xs text-foreground/70">
              Free for development · Unlimited dev environments
            </p>

            {/* Provider logos */}
            <div className="mt-8 flex items-center justify-center gap-6 text-foreground/70">
              <Image
                width={36}
                height={36}
                alt="gmail-logo"
                src="https://img.icons8.com/color/96/gmail-new.png"
              />
              <Image
                width={36}
                height={36}
                alt="outlook-logo"
                src="https://img.icons8.com/color/96/microsoft-outlook-2019--v2.png"
              />
              <Image
                width={36}
                height={36}
                alt="email-logo"
                src="https://img.icons8.com/ios/100/secured-letter--v1.png"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Benefits - concrete and product-focused */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ship email features with a single API
            </h2>
            <ul className="mt-6 grid gap-3 text-sm text-foreground/80 sm:grid-cols-2">
              <li>
                Unified API for Gmail, Outlook, and any IMAP/SMTP provider
              </li>
              <li>Zero provider configuration in development</li>
              <li>Unlimited development environments for users and teams</li>
              <li>Per-environment API keys and isolation</li>
              <li>
                Easy handoff: configure providers when promoting to production
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* Feature highlights - only what's in the product */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Feature highlights
            </h2>
            <p className="mt-3 text-foreground/80">
              Built around environments with provider gating and webhooks for
              production.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Unified inbox API",
                desc: "Send and work with mail via a single set of endpoints.",
              },
              {
                title: "Gmail, Outlook, IMAP/SMTP",
                desc: "Enable providers per environment; IMAP/SMTP without OAuth.",
              },
              {
                title: "Webhooks for production",
                desc: "Gmail and Outlook webhooks in production; disabled in development.",
              },
              {
                title: "Per-environment keys",
                desc: "Publishable/secret keys, provider credentials, and isolation.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-foreground/10 bg-background p-6"
              >
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground/80">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works - aligned to actual flows */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </div>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: 1,
                title: "Sign up",
                desc: "No credit card required for development.",
              },
              {
                step: 2,
                title: "Create a development environment",
                desc: "Get your publishable and secret keys.",
              },
              {
                step: 3,
                title: "Build and test",
                desc: "Use the unified API in dev; webhooks are disabled in development.",
              },
              {
                step: 4,
                title: "Promote to production",
                desc: "Enable providers, add credentials, configure webhooks, go live.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-foreground/10 bg-background p-6"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
                  {s.step}
                </span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-foreground/80">{s.desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Pricing and policy - concise, aligned with product */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pricing and policy
            </h2>
            <p className="mt-3 text-foreground/80">
              Free for development. Pay for production. No credit card required
              for development. No time limits.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-3xl grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-foreground/10 bg-background p-6 text-left">
              <h3 className="text-base font-semibold">Development</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80">
                <li>Free for development</li>
                <li>Unlimited dev environments per user/team</li>
                <li>Zero provider configuration in development</li>
                <li>Webhooks are disabled in the development environment</li>
              </ul>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-background p-6 text-left">
              <h3 className="text-base font-semibold">Production</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80">
                <li>Requires an active subscription</li>
                <li>Enable providers, add credentials, configure webhooks</li>
                <li>
                  Pricing is per active inbox connection, with transparent
                  overages for API calls and attachment bandwidth
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto mt-6 max-w-3xl text-sm text-foreground/70">
            <p>
              Development includes environments used for building, testing, or
              previews. Production is any environment serving real users or live
              traffic. Provider configuration is only required when promoting an
              environment to production.
            </p>
          </div>
        </Container>
      </section>

      {/* Existing pricing component */}
      <Pricing plan={plan} isAuthenticated={isAuthenticated} />

      {/* Social proof - minimal and honest */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for engineering teams
            </h2>
            <div className="mt-8 flex items-center justify-center gap-6 text-foreground/50">
              <Image
                width={36}
                height={36}
                alt="gmail-logo"
                src="https://img.icons8.com/color/96/gmail-new.png"
              />
              <Image
                width={36}
                height={36}
                alt="outlook-logo"
                src="https://img.icons8.com/color/96/microsoft-outlook-2019--v2.png"
              />
              <Image
                width={36}
                height={36}
                alt="email-logo"
                src="https://img.icons8.com/ios/100/secured-letter--v1.png"
              />
            </div>
            <p className="mt-3 text-xs text-foreground/70">
              Reliable by design. Tokens and credentials are encrypted at rest.
              Environments isolate access and configuration.
            </p>
          </div>
        </Container>
      </section>

      {/* FAQ - direct Q&A */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              FAQs
            </h2>
            <p className="mt-3 text-foreground/80">
              Direct answers for developers and engineering leaders.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-foreground/10 rounded-xl border border-foreground/10">
            {[
              {
                q: "Is development really free?",
                a: "Yes. Development is free with no credit card required, no time limits, and unlimited development environments.",
              },
              {
                q: "Are there any caps or fair-use limits?",
                a: "No caps for development. We may throttle clearly abusive traffic to protect the service.",
              },
              {
                q: "Do I need provider accounts or API keys for development?",
                a: "No. Provider configuration is not required in development. You add provider credentials only when promoting to production.",
              },
              {
                q: "How many development environments can I create?",
                a: "Unlimited - create dev or preview environments as needed.",
              },
              {
                q: "How do I move to production and when do I configure providers?",
                a: "Create or promote a production environment, then enable providers, add credentials, and configure webhooks.",
              },
              {
                q: "Can my whole team use development environments for free?",
                a: "Yes. Unlimited development environments per user and per team.",
              },
              {
                q: "What about security and isolation?",
                a: "Each environment is isolated. Tokens and secrets are encrypted at rest. Access is scoped per environment.",
              },
              {
                q: "What performance should I expect?",
                a: "Low-latency APIs tuned for development. Production throughput scales with your plan.",
              },
              {
                q: "Are webhooks available in development?",
                a: "Webhooks are disabled in the development environment. Configure Gmail/Outlook webhooks for production.",
              },
              {
                q: "Do you support IMAP/SMTP without OAuth?",
                a: "Yes. You can enable generic IMAP/SMTP for an environment with direct connection parameters.",
              },
            ].map((item, idx) => (
              <details key={idx} className="group">
                <summary className="cursor-pointer list-none px-6 py-4 text-left font-medium hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <div className="flex items-center justify-between">
                    <span>{item.q}</span>
                    <span className="ml-4 inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/20 text-foreground/70">
                      <svg
                        className="h-3 w-3 transition-transform group-open:rotate-45"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </div>
                </summary>
                <div className="px-6 pb-4 text-sm text-foreground/80">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center rounded-2xl border border-foreground/10 bg-[radial-gradient(60%_80%_at_50%_-20%,rgb(99_102_241/0.15),transparent_60%)] p-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Start now - free for development
            </h2>
            <p className="mt-2 text-sm text-foreground/80">
              Unlimited dev environments. Providers configured only at
              production.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-up"}
                className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Start free
              </Link>
              <Link
                href="/docs"
                className="rounded-md border border-foreground/20 px-5 py-3 text-sm font-medium text-foreground/90 hover:border-foreground/40"
              >
                Read the docs
              </Link>
            </div>
            <p className="mt-3 text-xs text-foreground/70">
              Free for development · Unlimited dev environments
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
