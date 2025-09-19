import Stripe from 'stripe';
import { subscriptions } from '../db/schema';
import db from '../db';
import { eq } from 'drizzle-orm';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function syncWithStripe(customerId: string) {
  const subscription = await stripe.subscriptions
    .list({
      customer: customerId,
    })
    .then((val) => val.data.at(0) ?? null); // Currently only allowing one subscription
  if (!subscription) {
    // Ensure the subscription is marked as cancelled
    await db
      .update(subscriptions)
      .set({
        productId: null,
        status: 'cancelled',
      })
      .where(eq(subscriptions.customerId, customerId));
    return;
  }
  const lineItems =
    subscription.items.data
      .filter((val) => val.plan.usage_type == 'licensed')
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
      customerId: customerId,
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

export const plans = {
  Basic: {
    productId: process.env.STRIPE_BASIC_PRODUCT!,
    apiCalls: 500_000,
    inboxes: 50,
    inboxPrice: 0.25,
    apiCallsPrice: 0.4, // Per 100,000
  },
  Growth: {
    productId: process.env.STRIPE_GROWTH_PRODUCT,
    apiCalls: 5_000_000,
    inboxes: 1_000,
    inboxPrice: 0.22,
    apiCallsPrice: 0.35,
  },
  Scale: {
    productId: process.env.STRIPE_SCALE_PRODUCT!,
    apiCalls: 20_000_000,
    inboxes: 5_000,
    inboxPrice: 0.2,
    apiCallsPrice: 0.3,
  },
};
