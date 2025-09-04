"use server";

import db from "@/utils/db";
import { environments, projects, webhooks } from "@/utils/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

export async function createWebhook(
  projectId: string,
  environmentId: string,
  name: string,
  url: string,
  active: boolean
) {
  const user = await currentUser();
  if (!user) {
    throw new Error("User not authenticated!");
  }
  await db
    .select()
    .from(environments)
    .innerJoin(projects, eq(projects.id, environments.projectId))
    .where(
      and(
        eq(environments.id, environmentId),
        eq(environments.projectId, projectId),
        eq(projects.userId, user.id)
      )
    );
  const webhook = await db
    .insert(webhooks)
    .values({
      environmentId,
      name: name,
      endpointUrl: url,
      active,
    })
    .returning()
    .then((val) => val.at(0) ?? null);
  if (!webhook) {
    throw Error("Failed to create webhook!");
  }
  return webhook;
}

export async function editWebhook(
  webhookId: string,
  name?: string,
  endpointUrl?: string,
  active?: boolean
) {
  const user = await currentUser();
  if (!user) {
    throw Error("User not authenticated!");
  }
  const webhook = await db
    .select({
      webhookId: webhooks.id,
    })
    .from(webhooks)
    .innerJoin(environments, eq(webhooks.environmentId, environments.id))
    .innerJoin(projects, eq(environments.projectId, projects.id))
    .where(and(eq(webhooks.id, webhookId), eq(projects.userId, user.id)))
    .limit(1);

  if (webhook.length === 0) {
    throw new Error(
      "Webhook not found or you don't have permission to update it"
    );
  }

  await db
    .update(webhooks)
    .set({
      name,
      endpointUrl,
      active,
    })
    .where(eq(webhooks.id, webhookId));

  return;
}

export async function deleteWebhook(webhookId: string) {
  const user = await currentUser();
  if (!user) {
    throw Error("User not authenticated!");
  }
  const webhook = await db
    .select({
      webhookId: webhooks.id,
    })
    .from(webhooks)
    .innerJoin(environments, eq(webhooks.environmentId, environments.id))
    .innerJoin(projects, eq(environments.projectId, projects.id))
    .where(and(eq(webhooks.id, webhookId), eq(projects.userId, user.id)))
    .limit(1);

  if (webhook.length === 0) {
    throw new Error(
      "Webhook not found or you don't have permission to update it"
    );
  }

  await db.delete(webhooks).where(eq(webhooks.id, webhookId));
}
