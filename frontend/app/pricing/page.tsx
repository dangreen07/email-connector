import Pricing from "@/components/pricing";
import db from "@/utils/db";
import { subscriptions, users } from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export default async function PricingPage() {
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

  return <Pricing plan={plan} isAuthenticated={isAuthenticated} />;
}
