"use client";

import Container from "@/components/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
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
import { useRouter } from "next/navigation";
import { DeleteProject, UpdateProjectName } from "../../_actions";

export default function EnvironmentDashboard(props: {
    projectName: string;
    environmentName: string;
    publishableKey: string;
    secretKey: string;
    enabledProviders: string[];
}) {
    const { projectName, environmentName, publishableKey, secretKey, enabledProviders } = props;
    const router = useRouter();

    const isProd = environmentName === "production";
    const [projectTab, setProjectTab] = useState<"connections" | "settings">("connections");
    const [publicKey] = useState<string>(publishableKey);
    const [privateKey] = useState<string>(secretKey);
    const [devOutlookEnabled, setDevOutlookEnabled] = useState<boolean>(enabledProviders.includes("outlook"));
    const [devGmailEnabled, setDevGmailEnabled] = useState<boolean>(enabledProviders.includes("gmail"));
    const [devImapEnabled, setDevImapEnabled] = useState<boolean>(enabledProviders.includes("smtp-imap"));
    const [editProjectName, setEditProjectName] = useState<string>(projectName);

    const outlookCredsComplete = true; // Placeholder for real validation when creds exist
    const gmailCredsComplete = true; // Placeholder for real validation when creds exist
    const productionHasMissingCreds = (isProd && devOutlookEnabled && !outlookCredsComplete) || (isProd && devGmailEnabled && !gmailCredsComplete);
    const canSave = !isProd || !productionHasMissingCreds;

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
        }
    };

    const handleRegenerate = () => {
        // Wired to server later; keep UI consistent with ClientDashboard
    };

    return (
        <Container>
            <Tabs value={projectTab} onValueChange={(v) => setProjectTab(v as typeof projectTab)} className="mt-6">
                <TabsList>
                    <TabsTrigger value="connections">Connections</TabsTrigger>
                    <TabsTrigger value="settings">Project Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="connections" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Provider connections</CardTitle>
                                <CardDescription>Toggle providers on or off for this environment.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <h3 className="text-sm font-medium">Outlook (Microsoft 365)</h3>
                                            <p className="text-xs text-foreground/70">Enable Outlook for this environment.</p>
                                        </div>
                                        <Switch checked={devOutlookEnabled} onCheckedChange={setDevOutlookEnabled} aria-label="Toggle Outlook" />
                                    </div>
                                    <Separator />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <h3 className="text-sm font-medium">Gmail</h3>
                                            <p className="text-xs text-foreground/70">Enable Gmail for this environment.</p>
                                        </div>
                                        <Switch checked={devGmailEnabled} onCheckedChange={setDevGmailEnabled} aria-label="Toggle Gmail" />
                                    </div>
                                    <Separator />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <h3 className="text-sm font-medium">IMAP/SMTP (optional)</h3>
                                            <p className="text-xs text-foreground/70">Enable generic IMAP/SMTP for testing.</p>
                                        </div>
                                        <Switch checked={devImapEnabled} onCheckedChange={setDevImapEnabled} aria-label="Toggle IMAP" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>API keys</CardTitle>
                                <CardDescription>Use these keys to authenticate requests.</CardDescription>
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
                    <div className="mt-6 flex items-center justify-end">
                        <Button disabled={!canSave}>Save changes</Button>
                    </div>
                </TabsContent>
                <TabsContent value="settings" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
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
                                        value={editProjectName}
                                        onChange={(e) => setEditProjectName(e.target.value)}
                                        onBlur={async (e) => {
                                            const value = e.target.value.trim();
                                            if (!value || value === projectName) return;
                                            try {
                                                const projectId = window.location.pathname.split("/")[2];
                                                const res = await UpdateProjectName(projectId, value);
                                                if (res && "error" in res) {
                                                    alert(res.error);
                                                }
                                            } catch {
                                                alert("Failed to update project");
                                            }
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col justify-between">
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
                                                This action cannot be undone. This will permanently delete the project &quot;{projectName}&quot; and remove all data.
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
                    </div>
                </TabsContent>
            </Tabs>
        </Container>
    );
}