"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DeleteProject } from "@/app/dashboard/_actions";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import { useRouter } from "next/navigation";

export default function DangerZone() {
  const { projectName } = useDashboardStore((state) => state);
  const router = useRouter();

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          Delete this project and all its environments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete project</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                project &quot;{projectName}&quot; and remove all data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={async () => {
                  try {
                    const projectId = window.location.pathname.split("/")[2];
                    const res = await DeleteProject(projectId);
                    if (res && "error" in res) {
                      alert(res.error);
                    } else {
                      router.push("/dashboard");
                    }
                  } catch {
                    alert("Failed to delete project");
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
