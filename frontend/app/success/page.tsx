import { syncWithStripe } from "@/utils/stripe/actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return redirect("/");
  }
  await syncWithStripe(userId);
  return redirect("/");
}
