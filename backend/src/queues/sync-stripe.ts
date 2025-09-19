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
import { plans, stripe } from '../utils/stripe';
import { queue } from '.';

export async function UsageReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: Job<{ userId: string }, any, string>,
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
    case plans.Basic.productId:
      includedAPICalls = plans.Basic.apiCalls;
      includedInboxes = plans.Basic.inboxes;
      break;
    case plans.Growth.productId:
      includedAPICalls = plans.Growth.apiCalls;
      includedInboxes = plans.Growth.inboxes;
      break;
    case plans.Scale.productId:
      includedAPICalls = plans.Scale.apiCalls;
      includedInboxes = plans.Scale.inboxes;
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

export async function SyncStripe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theJob: Job<{ customerId: string }, any, string>,
) {
  const customerId = theJob.data.customerId;

  const subscription = await db
    .select()
    .from(subscriptions)
    .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
    .where(eq(subscriptions.customerId, customerId))
    .then((val) => val.at(0) ?? null);
  const jobKey = `stripe-sync:${customerId}`;
  console.log(`Subscription: ${JSON.stringify(subscription)}`);
  console.log(`Job Key: ${jobKey}`);
  if (!subscription || subscription.subscriptions.status == 'cancelled') {
    try {
      // Ensure no job exists to update usage 5 minutes before the renewal
      const jobState = await queue.getJobState(jobKey);
      if (jobState == 'waiting') {
        // Delete the job
        await queue.remove(jobKey);
      }
    } catch {
      // This is fine
    }
    return;
  }
  // Ensure the queue job exists and has the right data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = (await queue.getJob(jobKey)) as Job<any, any, string> | undefined;
  const targetDate = subscription.subscriptions.currentPeriodEnd;
  const delay = targetDate.getTime() - Date.now() - 5 * 60 * 1000; // 5 minutes before the end
  if (!job) {
    // Create the job
    await queue.add(
      'usage-report',
      {
        userId: subscription.users.clerkUserId,
      },
      {
        jobId: jobKey,
        delay: delay,
      },
    );
  } else {
    // Attempt to change it's delay
    try {
      await job.changeDelay(delay);
    } catch {
      // Do nothing
    }
  }
}
