"use server";

import db from "@/utils/db";
import {
  connectedProviders,
  connections,
  connectionCredentials,
  environments,
  InsertWebhook,
  Log,
  logs,
  projects,
  subscriptions,
  users,
  Webhook,
  webhooks,
} from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray, desc, count } from "drizzle-orm";
import { randomBytes } from "crypto";
import { encrypt } from "@/utils/encryption";

function generateApiKey(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export async function CreateProject(name: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }
  try {
    const result = await db.transaction(async (tx) => {
      const projectId = await tx
        .insert(projects)
        .values({
          name,
          userId,
        })
        .returning({ id: projects.id })
        .then((value) => value.at(0)?.id ?? null);
      if (!projectId) {
        console.error("Failed to create project");
        throw new Error("Failed to create project");
      }

      const publishableKey = generateApiKey("pk_dev");
      const secretKey = generateApiKey("sk_dev");

      const environmentId = await tx
        .insert(environments)
        .values({
          name: "development",
          projectId,
          publishableKey,
          secretKey,
        })
        .returning({ id: environments.id })
        .then((value) => value.at(0)?.id ?? null);

      if (!environmentId) {
        console.error("Failed to create environment");
        throw new Error("Failed to create environment");
      }

      // Enable all providers by default
      const result = await tx
        .insert(connectedProviders)
        .values([
          {
            environmentId,
            providerCode: "gmail",
            enabled: true,
          },
          {
            environmentId,
            providerCode: "outlook",
            enabled: true,
          },
          {
            environmentId,
            providerCode: "smtp-imap",
            enabled: true,
          },
        ])
        .returning({ id: connectedProviders.id });
      if (result.length !== 3) {
        console.error("Failed to enable providers");
        throw new Error("Failed to enable providers");
      }
      return { projectId, environmentId };
    });
    return { projectId: result.projectId, environmentId: result.environmentId };
  } catch {
    return { error: "Failed to create project" };
  }
}

export async function CreateProductionEnvironment(
  projectId: string,
  mode: "blank" | "copy" = "copy"
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" } as const;
  }

  try {
    // Ensure the project belongs to the user and fetch environments
    const [project, existingProd, subscription] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .then((rows) => rows.at(0) ?? null),
      db
        .select()
        .from(environments)
        .where(
          and(
            eq(environments.projectId, projectId),
            eq(environments.name, "production")
          )
        )
        .then((rows) => rows.at(0) ?? null),
      db
        .select({ subscription: subscriptions })
        .from(subscriptions)
        .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
        .where(eq(users.clerkUserId, userId))
        .then((val) => val.at(0)?.subscription ?? null),
    ]);

    if (!project || project.userId !== userId) {
      return { error: "Not found" } as const;
    } else if (existingProd) {
      return { environmentId: existingProd.id } as const;
    } else if (subscription?.status != "active") {
      return {
        error: "You need a subscription to use production environments!",
      };
    }

    const publishableKey = generateApiKey("pk_prod");
    const secretKey = generateApiKey("sk_prod");

    const result = await db.transaction(async (tx) => {
      const newEnvironmentId = await tx
        .insert(environments)
        .values({
          name: "production",
          projectId,
          publishableKey,
          secretKey,
        })
        .returning({ id: environments.id })
        .then((value) => value.at(0)?.id ?? null);

      if (!newEnvironmentId) {
        throw new Error("Failed to create production environment");
      }

      if (mode === "copy") {
        // Look up providers from development and enable the same in production.
        const devEnv = await tx
          .select()
          .from(environments)
          .where(
            and(
              eq(environments.projectId, projectId),
              eq(environments.name, "development")
            )
          )
          .then((rows) => rows.at(0) ?? null);

        if (devEnv) {
          const devProviders = await tx
            .select({ providerCode: connectedProviders.providerCode })
            .from(connectedProviders)
            .where(eq(connectedProviders.environmentId, devEnv.id));

          if (devProviders.length > 0) {
            await tx.insert(connectedProviders).values(
              devProviders.map((p) => ({
                environmentId: newEnvironmentId,
                providerCode: p.providerCode,
              }))
            );
          }
        }
      }

      return { environmentId: newEnvironmentId } as const;
    });

    return result;
  } catch (error) {
    console.error(error);
    return { error: "Failed to create production environment" } as const;
  }
}

export async function DeleteProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" } as const;
  }
  try {
    await db.transaction(async (tx) => {
      // Ensure ownership
      const project = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .then((rows) => rows.at(0) ?? null);
      if (!project) {
        throw new Error("Not found");
      }

      // Gather environment IDs
      const envs = await tx
        .select({ id: environments.id })
        .from(environments)
        .where(eq(environments.projectId, projectId));
      const envIds = envs.map((e) => e.id);

      if (envIds.length > 0) {
        // Delete provider connections for those environments
        await tx
          .delete(connectedProviders)
          .where(inArray(connectedProviders.environmentId, envIds));
        // Delete environments
        await tx.delete(environments).where(inArray(environments.id, envIds));
      }
      // Delete project
      await tx.delete(projects).where(eq(projects.id, projectId));
    });
    return { ok: true } as const;
  } catch {
    return { error: "Failed to delete project" } as const;
  }
}

export async function UpdateEnvironmentSettings(
  projectId: string,
  environmentId: string,
  projectName: string,
  outlookEnabled: boolean,
  gmailEnabled: boolean,
  imapEnabled: boolean,
  outlookCredentials?: {
    clientId: string;
    clientSecret: string;
  },
  gmailCredentials?: {
    clientId: string;
    clientSecret: string;
    topicName: string;
  }
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" } as const;
  }

  try {
    await db
      .update(projects)
      .set({
        name: projectName,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    const environment = await db
      .select()
      .from(environments)
      .innerJoin(projects, eq(environments.projectId, projects.id))
      .where(
        and(eq(environments.id, environmentId), eq(projects.userId, userId))
      )
      .then((rows) => rows.at(0) ?? null);
    if (!environment) {
      return { error: "Environment not found" } as const;
    }

    await Promise.all([
      updateWithCredentials(
        outlookEnabled,
        environmentId,
        environment.environments.name,
        outlookCredentials,
        "outlook"
      ),

      updateWithCredentials(
        gmailEnabled,
        environmentId,
        environment.environments.name,
        gmailCredentials,
        "gmail"
      ),

      db
        .update(connectedProviders)
        .set({
          enabled: imapEnabled,
        })
        .where(
          and(
            eq(connectedProviders.environmentId, environmentId),
            eq(connectedProviders.providerCode, "smtp-imap")
          )
        ),
    ]);

    return { ok: true } as const;
  } catch {
    return { error: "Failed to update environment settings" } as const;
  }
}

export async function CreateWebhook(webhook: InsertWebhook) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const owned = await db
    .select()
    .from(projects)
    .innerJoin(environments, eq(environments.projectId, projects.id))
    .where(
      and(
        eq(projects.userId, userId),
        eq(environments.id, webhook.environmentId)
      )
    )
    .then((val) => val.at(0) ?? null);
  if (!owned) {
    return null;
  }
  const result = await db
    .insert(webhooks)
    .values(webhook)
    .returning()
    .then((val) => val.at(0) ?? null);
  if (!result) {
    // Error
    return null;
  }
  return result;
}

export async function UpdateWebhook(webhook: Webhook) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const owned = await db
    .select()
    .from(projects)
    .innerJoin(environments, eq(environments.projectId, projects.id))
    .where(
      and(
        eq(projects.userId, userId),
        eq(environments.id, webhook.environmentId)
      )
    )
    .then((val) => val.at(0) ?? null);
  if (!owned) {
    return null;
  }
  await db
    .update(webhooks)
    .set(webhook)
    .where(
      and(
        eq(webhooks.id, webhook.id),
        eq(webhooks.environmentId, webhook.environmentId)
      )
    );
  return null;
}

export async function DeleteWebhook(webhookId: string, environmentId: string) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const owned = await db
    .select()
    .from(projects)
    .innerJoin(environments, eq(environments.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(environments.id, environmentId)))
    .then((val) => val.at(0) ?? null);
  if (!owned) {
    return null;
  }

  await db
    .delete(webhooks)
    .where(
      and(eq(webhooks.id, webhookId), eq(webhooks.environmentId, environmentId))
    );
}

async function updateWithCredentials(
  enabled: boolean,
  environmentId: string,
  environmentName: string,
  credentials:
    | {
        clientId: string;
        clientSecret: string;
        topicName?: string;
      }
    | undefined,
  providerCode: "outlook" | "gmail"
) {
  if (enabled && environmentName == "production") {
    if (credentials) {
      const credentialsEncrypted = encrypt(
        JSON.stringify(credentials),
        process.env.CRED_ENCRYPTION_KEY!
      );
      await db
        .update(connectedProviders)
        .set({ enabled: enabled, credentials: credentialsEncrypted })
        .where(
          and(
            eq(connectedProviders.environmentId, environmentId),
            eq(connectedProviders.providerCode, providerCode)
          )
        );
    } else {
      // Credentials required to update this!
      // No error response, as this shouldn't happen. Just log it.
      console.log(
        `Credentials required for production environment! (${providerCode})`
      );
      await db
        .update(connectedProviders)
        .set({
          enabled: false,
        })
        .where(
          and(
            eq(connectedProviders.environmentId, environmentId),
            eq(connectedProviders.providerCode, providerCode)
          )
        );
      return;
    }
  }
  await db
    .update(connectedProviders)
    .set({
      enabled: enabled,
    })
    .where(
      and(
        eq(connectedProviders.environmentId, environmentId),
        eq(connectedProviders.providerCode, providerCode)
      )
    );
}

export async function regenerateKeys(environmentId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" } as const;
  }

  const name = await db
    .select({ name: environments.name })
    .from(environments)
    .innerJoin(projects, eq(projects.id, environments.projectId))
    .where(and(eq(projects.userId, userId), eq(environments.id, environmentId)))
    .then((val) => val.at(0) ?? null);
  if (!name) {
    return { error: "Unauthorized" } as const;
  }
  let publishableKey = "";
  let secretKey = "";
  if (name.name == "production") {
    publishableKey = generateApiKey("pk_prod");
    secretKey = generateApiKey("sk_prod");
  } else {
    publishableKey = generateApiKey("pk_dev");
    secretKey = generateApiKey("sk_dev");
  }
  await db
    .update(environments)
    .set({
      publishableKey,
      secretKey,
    })
    .where(eq(environments.id, environmentId));

  return {
    publishableKey,
    secretKey,
  };
}

type PageResult = {
  logs: Log[];
  total: number;
};

/**
 * Fetch a page of logs for an environment.
 * - environmentId: string (required)
 * - offset: number (skip)
 * - limit: number (take) — default 50
 */
export async function getLogsPage(
  environmentId: string,
  page = 1,
  pageSize = 50
): Promise<PageResult> {
  const { userId } = await auth();
  if (!userId) {
    return { logs: [], total: 0 };
  }
  if (!environmentId) return { logs: [], total: 0 };

  const offset = Math.max(0, page - 1) * pageSize;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(logs)
      .innerJoin(environments, eq(environments.id, logs.environmentId))
      .innerJoin(projects, eq(projects.id, environments.projectId))
      .where(eq(logs.environmentId, environmentId))
      .orderBy(desc(logs.requestAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(logs)
      .innerJoin(environments, eq(environments.id, logs.environmentId))
      .innerJoin(projects, eq(projects.id, environments.projectId))
      .where(eq(logs.environmentId, environmentId)),
  ]);

  const total = Number(totalResult?.[0]?.count ?? 0);

  return { logs: rows as unknown as Log[], total };
}

export type ConnectionInfo = {
  id: string;
  identifier: string;
  providerCode: string;
  email: string;
  updatedAt: Date;
};

export async function getConnections(
  environmentId: string
): Promise<ConnectionInfo[]> {
  const { userId } = await auth();
  if (!userId || !environmentId) return [];

  return await db
    .select({
      id: connections.id,
      identifier: connections.identifier,
      providerCode: connectionCredentials.providerCode,
      email: connectionCredentials.email,
      updatedAt: connectionCredentials.updatedAt,
    })
    .from(connections)
    .innerJoin(
      connectionCredentials,
      eq(connections.connectionCredentials, connectionCredentials.id),
    )
    .innerJoin(environments, eq(environments.id, connections.environmentId))
    .innerJoin(projects, eq(projects.id, environments.projectId))
    .where(
      and(
        eq(connections.environmentId, environmentId),
        eq(projects.userId, userId)
      )
    );
}

export async function deleteConnection(connectionId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" } as const;

  const result = await db
    .select({
      credentialsId: connectionCredentials.id,
    })
    .from(connections)
    .innerJoin(
      connectionCredentials,
      eq(connectionCredentials.id, connections.connectionCredentials),
    )
    .innerJoin(environments, eq(environments.id, connections.environmentId))
    .innerJoin(projects, eq(projects.id, environments.projectId))
    .where(
      and(eq(connections.id, connectionId), eq(projects.userId, userId))
    )
    .then((val) => val.at(0) ?? null);

  if (!result) {
    return { error: "Connection not found" } as const;
  }

  await db.transaction(async (tx) => {
    await tx.delete(connections).where(eq(connections.id, connectionId));
    await tx
      .delete(connectionCredentials)
      .where(eq(connectionCredentials.id, result.credentialsId));
  });

  return { ok: true } as const;
}
