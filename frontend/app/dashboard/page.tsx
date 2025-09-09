import db from "@/utils/db";
import { environments, FullProject, projects } from "@/utils/db/schema";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import NoProjectsState from "./NoProjectsState";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return redirect("/");

  const projectsList = await db
    .select()
    .from(projects)
    .leftJoin(environments, eq(projects.id, environments.projectId))
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

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
    return <NoProjectsState />;
  }
  projectsFull.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  return redirect(
    `/dashboard/${projectsFull[0].id}/${projectsFull[0].environments[0].id}`
  );
}
