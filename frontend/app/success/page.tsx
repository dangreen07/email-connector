import db from "@/utils/db";
import { users } from "@/utils/db/schema";
import { syncWithStripe } from "@/utils/stripe/actions";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function Page() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return redirect("/");
  }
  const customer = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .then((val) => val.at(0) ?? null);
  if (customer) {
    await syncWithStripe(customer.stripeCustomerId);
  }
  return redirect("/");
}
