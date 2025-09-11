"use server";

import db from "@/utils/db";
import {
  connectedProviders,
  environments,
  projects,
  Webhook,
  webhooks,
} from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
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
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((rows) => rows.at(0) ?? null);

    if (!project || project.userId !== userId) {
      return { error: "Not found" } as const;
    }

    // Check if production already exists
    const existingProd = await db
      .select()
      .from(environments)
      .where(
        and(
          eq(environments.projectId, projectId),
          eq(environments.name, "production")
        )
      )
      .then((rows) => rows.at(0) ?? null);

    if (existingProd) {
      return { environmentId: existingProd.id } as const;
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
  webhooksList: Webhook[],
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

      updateWebhooks(webhooksList, environmentId),
    ]);

    return { ok: true } as const;
  } catch {
    return { error: "Failed to update environment settings" } as const;
  }
}

async function updateWebhooks(webhookList: Webhook[], environmentId: string) {
  console.log(webhookList);
  return db.transaction(async (tx) => {
    // 1. Fetch current webhooks for this environment
    const current = await tx
      .select({
        id: webhooks.id,
        name: webhooks.name,
        endpointUrl: webhooks.endpointUrl,
        active: webhooks.active,
      })
      .from(webhooks)
      .where(eq(webhooks.environmentId, environmentId));

    const currentIds = current.map((w) => w.id);
    const incomingIds = webhookList.map((w) => w.id!);

    // 2. Delete webhooks that are in DB but not in new list
    const toDelete = currentIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await tx
        .delete(webhooks)
        .where(
          and(
            eq(webhooks.environmentId, environmentId),
            inArray(webhooks.id, toDelete)
          )
        );
    }

    // 3. Update existing webhooks
    for (const w of webhookList) {
      if (w.id && currentIds.includes(w.id)) {
        await tx
          .update(webhooks)
          .set({
            name: w.name,
            endpointUrl: w.endpointUrl,
            active: w.active,
          })
          .where(
            and(
              eq(webhooks.id, w.id),
              eq(webhooks.environmentId, environmentId)
            )
          );
      }
    }

    // 4. Insert new webhooks (no id provided)
    const toInsert = webhookList.filter((w) => !w.id);
    if (toInsert.length > 0) {
      await tx.insert(webhooks).values(
        toInsert.map((w) => ({
          environmentId,
          name: w.name,
          endpointUrl: w.endpointUrl,
          active: w.active,
        }))
      );
    }
  });
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
  console.log(environmentId);
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
