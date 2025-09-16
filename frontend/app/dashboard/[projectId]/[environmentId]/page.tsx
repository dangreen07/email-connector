import db from "@/utils/db";
import {
  connectedProviders,
  environments,
  projects,
  webhooks,
  logs,
} from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import EnvironmentDashboard from "./EnvironmentDashboard";
import { decrypt } from "@/utils/encryption";

export default async function EnvironmentPage({
  params,
}: {
  params: Promise<{ projectId: string; environmentId: string }>;
}) {
  const { projectId, environmentId } = await params;

  const { userId } = await auth();
  if (!userId) return null;

  const project = await db
    .select({
      projectName: projects.name,
      environmentName: environments.name,
      publishableKey: environments.publishableKey,
      secretKey: environments.secretKey,
    })
    .from(projects)
    .innerJoin(environments, eq(projects.id, environments.projectId))
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.id, projectId),
        eq(environments.id, environmentId)
      )
    )
    .then((rows) => rows.at(0) ?? null);

  if (!project) {
    return redirect("/dashboard");
  }
  const [providers, webhookList, logsList] = await Promise.all([
    db
      .select()
      .from(connectedProviders)
      .where(eq(connectedProviders.environmentId, environmentId))
      .then((providers) =>
        providers.map((provider) => {
          if (project.environmentName == "production") {
            if (provider.credentials) {
              const credentials = JSON.parse(
                decrypt(provider.credentials, process.env.CRED_ENCRYPTION_KEY!)
              );
              return {
                ...provider,
                providerCode: provider.providerCode as
                  | "gmail"
                  | "outlook"
                  | "smtp-imap",
                credentials: credentials,
              };
            }
          }
          return {
            ...provider,
            providerCode: provider.providerCode as
              | "gmail"
              | "outlook"
              | "smtp-imap",
            credentials: undefined,
          };
        })
      ),
    db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.environmentId, environmentId))),
    db
      .select()
      .from(logs)
      .where(eq(logs.environmentId, environmentId))
      .orderBy(desc(logs.requestAt))
      .limit(200),
  ]);

  return (
    <EnvironmentDashboard
      projectName={project.projectName}
      environmentName={project.environmentName}
      publishableKey={project.publishableKey}
      secretKey={project.secretKey}
      providers={providers}
      projectId={projectId}
      environmentId={environmentId}
      webhooks={webhookList}
      logs={logsList}
    />
  );
}
