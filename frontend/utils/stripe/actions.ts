"use server";

import { eq } from "drizzle-orm";
import db from "../db";
import { subscriptions, users } from "../db/schema";
import { stripe } from ".";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, RedirectType } from "next/navigation";

export async function createCheckoutLink(plan: "Basic" | "Growth" | "Scale") {
  const user = await currentUser();
  if (!user) return;

  let userRecord = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, user.id))
    .then((val) => val.at(0) ?? null);

  if (!userRecord) {
    const email = user.primaryEmailAddress;
    if (!email) return;

    const customer = await stripe.customers.create({
      name: `${user.firstName} ${user.lastName}`,
      email: email.emailAddress,
    });

    userRecord = await db
      .insert(users)
      .values({
        clerkUserId: user.id,
        stripeCustomerId: customer.id,
      })
      .returning()
      .then((val) => val.at(0) ?? null);

    if (!userRecord) return;
  }

  let line_items: { price: string; quantity?: number }[] = [];
  if (plan === "Basic") {
    line_items = [
      { price: process.env.STRIPE_BASIC!, quantity: 1 },
      { price: process.env.STRIPE_BASIC_INBOX_OVERAGE! },
      { price: process.env.STRIPE_BASIC_EXTRA_API_CALLS! },
    ];
  } else if (plan === "Growth") {
    line_items = [
      { price: process.env.STRIPE_GROWTH!, quantity: 1 },
      { price: process.env.STRIPE_GROWTH_INBOX_OVERAGE! },
      { price: process.env.STRIPE_GROWTH_EXTRA_API_CALLS! },
    ];
  } else if (plan === "Scale") {
    line_items = [
      { price: process.env.STRIPE_SCALE!, quantity: 1 },
      { price: process.env.STRIPE_SCALE_INBOX_OVERAGE! },
      { price: process.env.STRIPE_SCALE_EXTRA_API_CALLS! },
    ];
  }

  // Sync before doing anything
  await syncWithStripe(user.id);

  // Check existing subscription
  const subscription = await db
    .select({ subscriptions })
    .from(subscriptions)
    .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
    .where(eq(users.clerkUserId, user.id))
    .then((val) => val.at(0)?.subscriptions ?? null);

  if (!subscription || subscription.status == "cancelled") {
    // Create new subscription via Checkout
    const result = await stripe.checkout.sessions.create({
      customer: userRecord.stripeCustomerId,
      line_items,
      success_url: `${process.env.BASE_URL}/success`,
      cancel_url: `${process.env.BASE_URL}/`,
      mode: "subscription",
    });

    if (result?.url) {
      return redirect(result.url);
    }
    return;
  } else {
    // Fetch subscription with items
    const existingSub = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ["items"],
    });

    // Delete previous line items + add new ones
    await stripe.subscriptions.update(subscription.id, {
      items: [
        // Mark all old items for deletion
        ...existingSub.items.data.map((item) => ({
          id: item.id,
          deleted: true,
        })),
        // Add new subscription items
        ...line_items.map((item) => ({
          price: item.price,
          quantity: item.quantity,
        })),
      ],
      proration_behavior: "always_invoice",
    });

    return redirect("/success", RedirectType.push);
  }
}

export async function syncWithStripe(userId: string) {
  // Check if customer exists
  const customer = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .then((val) => val.at(0) ?? null);

  if (!customer) {
    return;
  }

  const subscription = await stripe.subscriptions
    .list({
      customer: customer.stripeCustomerId,
    })
    .then((val) => val.data.at(0) ?? null); // Currently only allowing one subscription
  if (!subscription) {
    // Ensure the subscription is marked as cancelled
    await db
      .update(subscriptions)
      .set({
        productId: null,
        status: "cancelled",
      })
      .where(eq(subscriptions.customerId, customer.stripeCustomerId));
    return;
  }
  const lineItems =
    subscription.items.data
      .filter((val) => val.plan.usage_type == "licensed")
      .at(0) ?? null; // Get the product for the licensed one to identify the plan
  if (!lineItems) {
    return; // An empty subscription shouldn't happen!
  }
  const productId = lineItems.plan.product;
  if (!productId) {
    return;
  }
  await db
    .insert(subscriptions)
    .values({
      id: subscription.id,
      customerId: customer.stripeCustomerId,
      productId: productId.toString(),
      status: subscription.status.toString(),
      billingCycleAnchor: new Date(subscription.billing_cycle_anchor * 1000),
      currentPeriodStart: new Date(lineItems.current_period_start * 1000),
      currentPeriodEnd: new Date(lineItems.current_period_end * 1000),
    })
    .onConflictDoUpdate({
      target: subscriptions.customerId,
      set: {
        id: subscription.id,
        productId: productId.toString(),
        status: subscription.status,
        billingCycleAnchor: new Date(subscription.billing_cycle_anchor * 1000),
        currentPeriodStart: new Date(lineItems.current_period_start * 1000),
        currentPeriodEnd: new Date(lineItems.current_period_end * 1000),
      },
    });
}
