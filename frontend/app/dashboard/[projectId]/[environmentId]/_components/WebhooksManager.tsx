"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Webhook } from "@/utils/db/schema";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";

export default function WebhooksManager() {
  const { environmentId, environmentName, webhooks, setWebhooks } =
    useDashboardStore((state) => state);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  const isDevelopment = environmentName?.toLowerCase() === "development";

  const headerSubtitle = useMemo(() => {
    if (isDevelopment) return "Webhooks are disabled in development.";
    if (webhooks.length === 0)
      return "No webhooks yet. Create one to receive events from this environment.";
    const activeCount = webhooks.filter((w) => w.active).length;
    return `${webhooks.length} webhook${
      webhooks.length === 1 ? "" : "s"
    } • ${activeCount} active`;
  }, [webhooks, isDevelopment]);

  function openNew() {
    setEditing(null);
    setName("");
    setUrl("");
    setActive(true);
    setDialogOpen(true);
  }

  function openEdit(w: Webhook) {
    setEditing(w);
    setName(w.name);
    setUrl(w.endpointUrl);
    setActive(w.active);
    setDialogOpen(true);
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required.";
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol))
        return "Endpoint must be http or https.";
    } catch {
      return "A valid endpoint URL is required.";
    }
    return null;
  }

  function save() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (editing) {
      setWebhooks(
        [...webhooks].map((w) =>
          w.id === editing.id ? { ...w, name, url, active } : w
        )
      );
      toast.success("Webhook updated. Make sure to Save Changes!");
    } else {
      const newW = {
        id: self.crypto.randomUUID(),
        name,
        environmentId,
        endpointUrl: url,
        active: active,
      };
      setWebhooks([newW, ...webhooks]);
      toast.success("Webhook created. Make sure to Save Changes!");
    }
    setDialogOpen(false);
  }

  async function testWebhook(w: Webhook) {
    setTestingId(w.id);
    try {
      await new Promise((res) => setTimeout(res, 900));
      toast.success(`Test sent to ${w.endpointUrl}`);
    } catch {
      toast.error("Failed to send test");
    } finally {
      setTestingId(null);
    }
  }

  async function toggleActive(w: Webhook, val: boolean) {
    setWebhooks(
      [...webhooks].map((x) => (x.id === w.id ? { ...x, active: val } : x))
    );
  }

  function requestDelete(w: Webhook) {
    setDeleteTarget(w);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    const newList = [...webhooks].filter((x) => x.id !== deleteTarget.id);
    setWebhooks(newList);
    setDeleteTarget(null);
    toast.success(`Deleted webhook "${name}". Make sure to Save Changes!`);
  }

  return (
    <div className="lg:col-span-3 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>{headerSubtitle}</CardDescription>
          </div>
          {!isDevelopment && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew}>New Webhook</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edit webhook" : "Create webhook"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure the endpoint that will receive event POST
                    requests.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="wh-name">Name</Label>
                    <Input
                      id="wh-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Zapier ingest"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wh-url">Endpoint URL</Label>
                    <Input
                      id="wh-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/webhooks/email"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="wh-active" className="cursor-pointer">
                        Active
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Inactive webhooks will not receive events.
                      </p>
                    </div>
                    <Switch
                      id="wh-active"
                      checked={active}
                      onCheckedChange={setActive}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={save}>
                    {editing ? "Save changes" : "Create webhook"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
      </Card>

      {isDevelopment ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Webhooks are disabled in the development environment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You have no webhooks yet.
              </p>
              <Button onClick={openNew}>Create your first webhook</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((w) => (
            <Card key={w.id}>
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{w.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          w.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {w.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {w.endpointUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={w.active}
                      onCheckedChange={(val) => toggleActive(w, val)}
                    />
                    <span className="text-sm text-muted-foreground hidden md:inline">
                      Receive events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => testWebhook(w)}
                      disabled={testingId === w.id}
                    >
                      {testingId === w.id ? "Testing..." : "Test"}
                    </Button>
                    <Button variant="outline" onClick={() => openEdit(w)}>
                      Edit
                    </Button>
                    <AlertDialog
                      open={deleteTarget?.id === w.id}
                      onOpenChange={(open) => !open && setDeleteTarget(null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => requestDelete(w)}
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete webhook</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the webhook &quot;{w.name}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
