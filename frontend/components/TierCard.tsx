import { createCheckoutLink } from "@/utils/stripe/actions";
import { Tier } from "@/utils/types";
import CheckoutButton from "./checkout-button";
import Link from "next/link";

export const TierCard = ({
  tier,
  plan,
  isAuthenticated,
}: {
  tier: Tier;
  plan: "Free" | "Basic" | "Growth" | "Scale";
  isAuthenticated: boolean;
}) => {
  const tiers = ["Free", "Basic", "Growth", "Scale"] as const;

  const getActionLabel = () => {
    const currentIndex = tiers.indexOf(plan);
    const targetIndex = tiers.indexOf(tier.name as (typeof tiers)[number]);

    if (targetIndex > currentIndex) return `Upgrade to ${tier.name}`;
    if (targetIndex < currentIndex) return `Downgrade to ${tier.name}`;
    return "Current Plan";
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
        {isAuthenticated ? (
          <form action={async () => createCheckoutLink(tier.name)}>
            <CheckoutButton
              highlighted={tier.highlighted}
              cta={getActionLabel()}
              disabled={getActionLabel() === "Current Plan"}
            />
          </form>
        ) : (
          <Link
            href={tier.href}
            className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
              tier.highlighted
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "border border-foreground/20 text-foreground/90 hover:border-foreground/40"
            }`}
          >
            {getActionLabel()}
          </Link>
        )}
      </div>
    </div>
  );
};
