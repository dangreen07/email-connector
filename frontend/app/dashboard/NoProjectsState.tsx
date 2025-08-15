"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CreateProject } from "./_actions";
import { useRouter } from "next/navigation";

export default function NoProjectsState() {
    const [projectName, setProjectName] = useState("");

    const router = useRouter();

    return (
        <div className="mx-auto max-w-md py-16">
            <h1 className="text-2xl font-semibold tracking-tight text-center">Create your first project</h1>
            <p className="mt-2 text-center text-sm text-foreground/70">Name your project to get started. You can change this later.</p>
            <div className="mt-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input id="project-name" name="name" placeholder="Awesome App" required value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <Button onClick={async () => {
                        const result = await CreateProject(projectName);
                        if (result.error) {
                            alert(result.error);
                        } else {
                            router.push(`/dashboard/${result.projectId}/${result.environmentId}`);
                        }
                    }}>Create</Button>
                </div>
            </div>
        </div>
    );
}
