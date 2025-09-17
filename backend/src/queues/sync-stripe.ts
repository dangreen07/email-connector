import { Job } from 'bullmq';
import db from '../db';
import {
  connectionCredentials,
  connections,
  environments,
  projects,
  subscriptions,
  users,
} from '../db/schema';
import { count, eq, inArray } from 'drizzle-orm';
import redis from '../redis';
import { stripe } from '../utils/stripe';

export async function UsageReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: Job<{ userId: string; currentAPICalls: number }, any, string>,
) {
  const data = job.data;

  const [environmentList, subscription] = await Promise.all([
    db
      .select({ environmentId: environments.id })
      .from(environments)
      .innerJoin(projects, eq(projects.id, environments.projectId))
      .where(eq(projects.userId, data.userId)),
    db
      .select({ subscriptions })
      .from(subscriptions)
      .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
      .where(eq(users.clerkUserId, data.userId))
      .then((val) => val.at(0)?.subscriptions ?? null),
  ]);

  const [inboxConnections] = await db
    .select({ count: count() })
    .from(connectionCredentials)
    .innerJoin(
      connections,
      eq(connections.connectionCredentials, connectionCredentials.id),
    )
    .where(
      inArray(
        connections.environmentId,
        environmentList.map((item) => item.environmentId),
      ),
    );

  if (!subscription) {
    return;
  }

  const apiCallsList = await Promise.all(
    environmentList.map((item) => redis.get(`api-calls:${item.environmentId}`)),
  ).then((val) => val.filter((item) => item !== null));

  const totalAPICalls = apiCallsList.reduce((total, curr) => {
    return total + Number(curr);
  }, 0);

  let includedAPICalls = 0;
  let includedInboxes = 0;

  switch (subscription.productId) {
    case process.env.STRIPE_BASIC_PRODUCT!:
      includedAPICalls = 500_000;
      includedInboxes = 50;
      break;
    case process.env.STRIPE_GROWTH_PRODUCT!:
      includedAPICalls = 5_000_000;
      includedInboxes = 1_000;
      break;
    case process.env.STRIPE_SCALE_PRODUCT!:
      includedAPICalls = 20_000_000;
      includedInboxes = 5_000;
      break;
  }

  const inboxOverage = Math.max(0, inboxConnections.count - includedInboxes);
  const apiCallsOverages = Math.max(0, totalAPICalls - includedAPICalls);

  if (inboxOverage > 0) {
    await stripe.billing.meterEvents.create({
      event_name: 'inbox_overage',
      payload: {
        value: inboxOverage.toString(),
        stripe_customer_id: subscription.customerId,
      },
    });
  }
  if (apiCallsOverages > 0) {
    await stripe.billing.meterEvents.create({
      event_name: 'extra_api_calls',
      payload: {
        value: apiCallsOverages.toString(),
        stripe_customer_id: subscription.customerId,
      },
    });
  }
}
