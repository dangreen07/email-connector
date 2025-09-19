import db from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  environments,
  FullProject,
  projects,
  subscriptions,
  users,
} from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import DashboardSelector from "./DashboardSelector";
import { DashboardStoreProvider } from "@/lib/dashboard/dashboard-store-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) return redirect("/");

  const [projectsList, subscription] = await Promise.all([
    db
      .select()
      .from(projects)
      .leftJoin(environments, eq(projects.id, environments.projectId))
      .where(eq(projects.userId, userId)),
    db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .innerJoin(users, eq(users.stripeCustomerId, subscriptions.customerId))
      .where(eq(users.clerkUserId, userId))
      .then((val) => val.at(0) ?? null),
  ]);

  const projectsFull: FullProject[] = projectsList.reduce((acc, row) => {
    let existingProject = acc.find((p) => p.id === row.projects.id);

    if (!existingProject) {
      existingProject = {
        ...row.projects,
        environments: [],
      };
      acc.push(existingProject);
    }
    if (row.environments) {
      existingProject.environments.push(row.environments);
    }
    return acc;
  }, [] as FullProject[]);

  if (projectsFull.length === 0) {
    return children;
  }

  return (
    <DashboardStoreProvider>
      <DashboardSelector
        projects={projectsFull}
        subscriptionStatus={subscription?.status}
      />
      <div className="min-h-[calc(100vh-9.5rem)]">{children}</div>
    </DashboardStoreProvider>
  );
}
