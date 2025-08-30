"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";

export default function ProjectDetails() {
  const { projectName, setProjectName } = useDashboardStore((state) => state);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Project details</CardTitle>
        <CardDescription>
          Rename your project and manage basic settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name-edit">Name</Label>
          <Input
            id="project-name-edit"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
