"use server";

import db from "@/utils/db";
import { connectedProviders, environments, projects } from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

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
            const projectId = await tx.insert(projects).values({
                name,
                userId
            }).returning({ id: projects.id }).then((value) => value.at(0)?.id ?? null);
            if (!projectId) {
                console.error("Failed to create project");
                throw new Error("Failed to create project");
            }

            const publishableKey = generateApiKey("pk_dev");
            const secretKey = generateApiKey("sk_dev");

            const environmentId = await tx.insert(environments).values({
                name: "development",
                projectId,
                publishableKey,
                secretKey
            }).returning({ id: environments.id }).then((value) => value.at(0)?.id ?? null);

            if (!environmentId) {
                console.error("Failed to create environment");
                throw new Error("Failed to create environment");
            }

            // Enable all providers by default
            const result = await tx.insert(connectedProviders).values([
                {
                    environmentId,
                    providerCode: "gmail"
                },
                {
                    environmentId,
                    providerCode: "outlook"
                },
                {
                    environmentId,
                    providerCode: "smtp-imap"
                }
            ]).returning({ id: connectedProviders.id });
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
            .where(and(eq(environments.projectId, projectId), eq(environments.name, "production")))
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
                    .where(and(eq(environments.projectId, projectId), eq(environments.name, "development")))
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

export async function UpdateProjectName(projectId: string, name: string) {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Unauthorized" } as const;
    }
    if (!name.trim()) {
        return { error: "Invalid name" } as const;
    }
    try {
        const updated = await db
            .update(projects)
            .set({ name: name.trim(), updatedAt: new Date() })
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
            .returning({ id: projects.id });
        if (updated.length === 0) {
            return { error: "Not found" } as const;
        }
        return { ok: true } as const;
    } catch {
        return { error: "Failed to update project" } as const;
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
                await tx.delete(connectedProviders).where(inArray(connectedProviders.environmentId, envIds));
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