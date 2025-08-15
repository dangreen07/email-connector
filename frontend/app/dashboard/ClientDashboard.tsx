"use client";

import { useState } from "react";
import Container from "@/components/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { FullProject } from "@/utils/db/schema";

export default function ClientDashboard({ projects: initialProjects }: { projects: FullProject[] }) {
    const [environment, setEnvironment] = useState<"development" | "production">("development");
    const [projectTab, setProjectTab] = useState<"connections" | "settings">("connections");

    const [projects, setProjects] = useState<FullProject[]>(initialProjects);
    const [activeProjectId, setActiveProjectId] = useState<string>(initialProjects[0]?.id ?? "");
    const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    const [isCreateProdOpen, setIsCreateProdOpen] = useState(false);
    const [prodInitMode, setProdInitMode] = useState<"blank" | "copy">("copy");

    const [publicKey, setPublicKey] = useState<string>("pk_dev_XXXXXXXXXXXXXXXX");
    const [privateKey, setPrivateKey] = useState<string>("sk_dev_XXXXXXXXXXXXXXXX");

    const [devOutlookEnabled, setDevOutlookEnabled] = useState<boolean>(false);
    const [devGmailEnabled, setDevGmailEnabled] = useState<boolean>(false);
    const [devImapEnabled, setDevImapEnabled] = useState<boolean>(false);

    const [prodOutlookEnabled, setProdOutlookEnabled] = useState<boolean>(false);
    const [prodGmailEnabled, setProdGmailEnabled] = useState<boolean>(false);

    const [azureTenantId, setAzureTenantId] = useState<string>("");
    const [azureClientId, setAzureClientId] = useState<string>("");
    const [azureClientSecret, setAzureClientSecret] = useState<string>("");
    const [azureRedirectUri, setAzureRedirectUri] = useState<string>("");

    const [gcpProjectId, setGcpProjectId] = useState<string>("");
    const [gcpClientId, setGcpClientId] = useState<string>("");
    const [gcpClientSecret, setGcpClientSecret] = useState<string>("");
    const [gcpRedirectUri, setGcpRedirectUri] = useState<string>("");

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
        }
    };

    const handleRegenerate = () => {
        const prefix = environment === "development" ? "_dev_" : "_prod_";
        setPublicKey(`pk${prefix}${Math.random().toString(36).slice(2, 10)}`);
        setPrivateKey(`sk${prefix}${Math.random().toString(36).slice(2, 10)}`);
    };

    const outlookCredsComplete = !!(azureTenantId && azureClientId && azureClientSecret && azureRedirectUri);
    const gmailCredsComplete = !!(gcpProjectId && gcpClientId && gcpClientSecret && gcpRedirectUri);
    const productionHasMissingCreds = (prodOutlookEnabled && !outlookCredsComplete) || (prodGmailEnabled && !gmailCredsComplete);
    const canSave = environment === "development" ? true : !productionHasMissingCreds;

    if (!activeProject) {
        return null;
    }

    return (
        <Container className="py-8">
            <Tabs value={environment} onValueChange={(v) => setEnvironment(v as typeof environment)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Label className="text-sm">Project</Label>
                        <Select
                            value={activeProjectId}
                            onValueChange={(v) => {
                                setActiveProjectId(v);
                                setEnvironment("development");
                            }}
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
                                        onClick={() => {
                                            if (!newProjectName.trim()) return;
                                            const id = `p_${Math.random().toString(36).slice(2, 8)}`;
                                            setProjects((prev) => [...prev, { id, name: newProjectName.trim(), updatedAt: new Date(), userId: "", environments: [] }]);
                                            setActiveProjectId(id);
                                            setNewProjectName("");
                                            setIsNewProjectOpen(false);
                                        }}
                                    >
                                        Create project
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="development">Development</TabsTrigger>
                            {activeProject.environments.some((e) => e.name === "production") && (
                                <TabsTrigger value="production">Production</TabsTrigger>
                            )}
                        </TabsList>
                        {!activeProject.environments.some((e) => e.name === "production") && (
                            <Dialog open={isCreateProdOpen} onOpenChange={setIsCreateProdOpen}>
                                <DialogTrigger asChild>
                                    <Button>Create production…</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create production environment</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <p className="text-sm text-foreground/80">Choose how to initialize production for <span className="font-medium">{activeProject.name}</span>.</p>
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
                                            onClick={() => {
                                                setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, hasProduction: true } : p)));
                                                setEnvironment("production");
                                                setIsCreateProdOpen(false);
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

                <Tabs value={projectTab} onValueChange={(v) => setProjectTab(v as typeof projectTab)} className="mt-6">
                    <TabsList>
                        <TabsTrigger value="connections">Connections</TabsTrigger>
                        <TabsTrigger value="settings">Project Settings</TabsTrigger>
                    </TabsList>
                </Tabs>

                {projectTab === "connections" && (
                    <>
                        <TabsContent value="development" className="mt-6">
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Provider connections</CardTitle>
                                        <CardDescription>Toggle providers on or off for your development environment.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">Outlook (Microsoft 365)</h3>
                                                    <p className="text-xs text-foreground/70">Enable Outlook for development testing.</p>
                                                </div>
                                                <Switch checked={devOutlookEnabled} onCheckedChange={setDevOutlookEnabled} aria-label="Toggle Outlook in development" />
                                            </div>
                                            <Separator />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">Gmail</h3>
                                                    <p className="text-xs text-foreground/70">Enable Gmail for development testing.</p>
                                                </div>
                                                <Switch checked={devGmailEnabled} onCheckedChange={setDevGmailEnabled} aria-label="Toggle Gmail in development" />
                                            </div>
                                            <Separator />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">IMAP/SMTP (optional)</h3>
                                                    <p className="text-xs text-foreground/70">Enable generic IMAP/SMTP for testing.</p>
                                                </div>
                                                <Switch checked={devImapEnabled} onCheckedChange={setDevImapEnabled} aria-label="Toggle IMAP in development" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>API keys</CardTitle>
                                        <CardDescription>Use these keys to authenticate requests to MailLink.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="public-key">Public key</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="public-key" value={publicKey} readOnly className="font-mono" />
                                                <Button variant="outline" onClick={() => handleCopy(publicKey)}>Copy</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="private-key">Private key</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="private-key" type="password" value={privateKey} readOnly className="font-mono" />
                                                <Button variant="outline" onClick={() => handleCopy(privateKey)}>Copy</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex items-center justify-between">
                                        <p className="text-xs text-foreground/70">Keys are environment-scoped.</p>
                                        <Button variant="secondary" onClick={handleRegenerate}>Regenerate</Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="production" className="mt-6">
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Provider connections</CardTitle>
                                        <CardDescription>Toggle providers on or off for your production environment.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">Outlook (Microsoft 365)</h3>
                                                    <p className="text-xs text-foreground/70">Enable Outlook using your Azure OAuth app.</p>
                                                </div>
                                                <Switch checked={prodOutlookEnabled} onCheckedChange={setProdOutlookEnabled} aria-label="Toggle Outlook in production" />
                                            </div>
                                            <Separator />
                                            {prodOutlookEnabled && (
                                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="azure-tenant">Tenant ID</Label>
                                                        <Input id="azure-tenant" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={azureTenantId} onChange={(e) => setAzureTenantId(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="azure-client-id">Client ID</Label>
                                                        <Input id="azure-client-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={azureClientId} onChange={(e) => setAzureClientId(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="azure-client-secret">Client Secret</Label>
                                                        <Input id="azure-client-secret" type="password" placeholder="••••••••••••••••" value={azureClientSecret} onChange={(e) => setAzureClientSecret(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="azure-redirect">Redirect URI</Label>
                                                        <Input id="azure-redirect" placeholder="https://yourapp.com/api/callback/outlook" value={azureRedirectUri} onChange={(e) => setAzureRedirectUri(e.target.value)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <h3 className="text-sm font-medium">Gmail</h3>
                                                    <p className="text-xs text-foreground/70">Enable Gmail using your Google Cloud OAuth app.</p>
                                                </div>
                                                <Switch checked={prodGmailEnabled} onCheckedChange={setProdGmailEnabled} aria-label="Toggle Gmail in production" />
                                            </div>
                                            {prodGmailEnabled && (
                                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="gcp-project-id">Project ID</Label>
                                                        <Input id="gcp-project-id" placeholder="your-gcp-project" value={gcpProjectId} onChange={(e) => setGcpProjectId(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="gcp-client-id">OAuth Client ID</Label>
                                                        <Input id="gcp-client-id" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com" value={gcpClientId} onChange={(e) => setGcpClientId(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="gcp-client-secret">OAuth Client Secret</Label>
                                                        <Input id="gcp-client-secret" type="password" placeholder="••••••••••••••••" value={gcpClientSecret} onChange={(e) => setGcpClientSecret(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="gcp-redirect">Redirect URI</Label>
                                                        <Input id="gcp-redirect" placeholder="https://yourapp.com/api/callback/gmail" value={gcpRedirectUri} onChange={(e) => setGcpRedirectUri(e.target.value)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>API keys</CardTitle>
                                        <CardDescription>Keys for production environment.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="public-key-prod">Public key</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="public-key-prod" value={publicKey.replace("_dev_", "_prod_")} readOnly className="font-mono" />
                                                <Button variant="outline" onClick={() => handleCopy(publicKey.replace("_dev_", "_prod_"))}>Copy</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="private-key-prod">Private key</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="private-key-prod" type="password" value={privateKey.replace("_dev_", "_prod_")} readOnly className="font-mono" />
                                                <Button variant="outline" onClick={() => handleCopy(privateKey.replace("_dev_", "_prod_"))}>Copy</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex items-center justify-between">
                                        <p className="text-xs text-foreground/70">Keep your production private key secret.</p>
                                        <Button variant="secondary" onClick={handleRegenerate}>Regenerate</Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </TabsContent>
                        <div className="mt-6 flex items-center justify-end">
                            <Button disabled={!canSave}>Save changes</Button>
                        </div>
                    </>
                )}

                {projectTab === "settings" && (
                    <div className="grid gap-6 lg:grid-cols-3 mt-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Project details</CardTitle>
                                <CardDescription>Rename your project and manage basic settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="project-name-edit">Name</Label>
                                    <Input
                                        id="project-name-edit"
                                        value={activeProject?.name ?? ""}
                                        onChange={(e) =>
                                            setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, name: e.target.value } : p)))
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Danger zone</CardTitle>
                                <CardDescription>Delete this project and all its environments.</CardDescription>
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
                                                This action cannot be undone. This will permanently delete the project &quot;{activeProject?.name}&quot; and remove all data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    setProjects((prev) => prev.filter((p) => p.id !== activeProjectId));
                                                    setTimeout(() => {
                                                        const remaining = projects.filter((p) => p.id !== activeProjectId);
                                                        if (remaining.length > 0) {
                                                            setActiveProjectId(remaining[0].id);
                                                        } else {
                                                            const id = `p_${Math.random().toString(36).slice(2, 8)}`;
                                                            setProjects([{ id, name: "New Project", updatedAt: new Date(), userId: "", environments: [] }]);
                                                            setActiveProjectId(id);
                                                        }
                                                        setEnvironment("development");
                                                    }, 0);
                                                }}
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </Tabs>
        </Container>
    );
}
