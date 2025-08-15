"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullProject } from "@/utils/db/schema";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { CreateProductionEnvironment, CreateProject } from "./_actions";

export default function DashboardSelector({ projects }: { projects: FullProject[] }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const { activeProjectId, activeEnvironmentId } = useMemo(() => {
        // Expected pattern: /dashboard/{projectId}/{environmentId}
        const parts = pathname?.split("/").filter(Boolean) ?? [];
        const projectId = parts[0] === "dashboard" ? parts[1] : undefined;
        const environmentId = parts[0] === "dashboard" ? parts[2] : undefined;
        return { activeProjectId: projectId ?? projects.at(0)?.id, activeEnvironmentId: environmentId ?? projects.at(0)?.environments.at(0)?.id };
    }, [pathname, projects]);

    const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) ?? projects.at(0), [projects, activeProjectId]);
    const hasProduction = !!activeProject?.environments.some((e) => e.name === "production");

    const [isCreateProdOpen, setIsCreateProdOpen] = useState(false);
    const [prodInitMode, setProdInitMode] = useState<"blank" | "copy">("copy");

    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    function navigateTo(projectId: string, envNameOrId?: string) {
        const project = projects.find((p) => p.id === projectId);
        if (!project) return;
        let envId = envNameOrId;
        if (!envId) {
            const dev = project.environments.find((e) => e.name === "development");
            envId = dev?.id ?? project.environments.at(0)?.id;
        } else {
            // envNameOrId may be a name like "development" or an ID; resolve if needed
            const byName = project.environments.find((e) => e.name === envId);
            envId = byName?.id ?? envId;
        }
        if (envId) router.push(`/dashboard/${projectId}/${envId}`);
    }

    return (
        <div className="py-6 border-b border-foreground/10">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Label className="text-sm">Project</Label>
                        <Select
                            value={activeProject?.id}
                            onValueChange={(projectId) => navigateTo(projectId)}
                        >
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">New project</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create a new project</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 py-2">
                                    <Label htmlFor="project-name">Project name</Label>
                                    <Input id="project-name" placeholder="Awesome App" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                                </div>
                                <DialogFooter>
                                    <Button
                                        disabled={!newProjectName.trim() || isPending}
                                        onClick={() => {
                                            const name = newProjectName.trim();
                                            if (!name) return;
                                            startTransition(async () => {
                                                const result = await CreateProject(name);
                                                if (result && "error" in result) {
                                                    alert(result.error);
                                                } else if (result && result.projectId && result.environmentId) {
                                                    setNewProjectName("");
                                                    setIsNewProjectOpen(false);
                                                    router.push(`/dashboard/${result.projectId}/${result.environmentId}`);
                                                }
                                            });
                                        }}
                                    >
                                        Create project
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex items-center justify-between">
                        <Tabs value={activeProject?.environments?.find((e) => e.id === activeEnvironmentId)?.name ?? "development"}
                            onValueChange={(val) => { if (activeProject) navigateTo(activeProject.id, val as "development" | "production"); }}
                        >
                            <TabsList>
                                {activeProject?.environments?.some((e) => e.name === "development") && (
                                    <TabsTrigger value="development">Development</TabsTrigger>
                                )}
                                {hasProduction && (
                                    <TabsTrigger value="production">Production</TabsTrigger>
                                )}
                            </TabsList>
                        </Tabs>
                        {!hasProduction && activeProject && (
                            <Dialog open={isCreateProdOpen} onOpenChange={setIsCreateProdOpen}>
                                <DialogTrigger asChild>
                                    <Button className="ml-3">Create production…</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create production environment</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <p className="text-sm text-foreground/80">Choose how to initialize production for <span className="font-medium">{activeProject?.name}</span>.</p>
                                        </div>
                                        <RadioGroup value={prodInitMode} onValueChange={(v) => setProdInitMode(v as typeof prodInitMode)}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem id="copy" value="copy" />
                                                <Label htmlFor="copy">Copy settings from development</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem id="blank" value="blank" />
                                                <Label htmlFor="blank">Start with a blank production</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            disabled={!activeProject || isPending}
                                            onClick={() => {
                                                if (!activeProject) return;
                                                startTransition(async () => {
                                                    const res = await CreateProductionEnvironment(activeProject.id, prodInitMode);
                                                    if (res && "error" in res) {
                                                        alert(res.error);
                                                    } else if (res && res.environmentId) {
                                                        setIsCreateProdOpen(false);
                                                        navigateTo(activeProject.id, res.environmentId);
                                                    }
                                                });
                                            }}
                                        >
                                            Create production
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}