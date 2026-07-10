"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import {
  getConnections,
  deleteConnection,
} from "@/app/dashboard/_actions";
import type { ConnectionInfo } from "@/app/dashboard/_actions";

type Props = {
  initialConnections: ConnectionInfo[];
};

const providerConfig: Record<string, { label: string; className: string }> = {
  gmail: { label: "Gmail", className: "bg-red-100 text-red-800 border-red-200" },
  outlook: { label: "Outlook", className: "bg-blue-100 text-blue-800 border-blue-200" },
  "smtp-imap": { label: "SMTP/IMAP", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function ConnectedAccounts({ initialConnections }: Props) {
  const { environmentId } = useDashboardStore((s) => s);
  const [connections, setConnections] = useState<ConnectionInfo[]>(initialConnections);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConnectionInfo | null>(null);

  const headerSubtitle = useMemo(() => {
    if (connections.length === 0)
      return "No connected accounts yet. Connect a provider to get started.";
    const gmailCount = connections.filter((c) => c.providerCode === "gmail").length;
    const outlookCount = connections.filter((c) => c.providerCode === "outlook").length;
    const smtpCount = connections.filter((c) => c.providerCode === "smtp-imap").length;
    const parts: string[] = [];
    if (gmailCount) parts.push(`${gmailCount} Gmail`);
    if (outlookCount) parts.push(`${outlookCount} Outlook`);
    if (smtpCount) parts.push(`${smtpCount} SMTP/IMAP`);
    return `${connections.length} connection${connections.length !== 1 ? "s" : ""} (${parts.join(", ")})`;
  }, [connections]);

  async function refresh() {
    if (!environmentId) return;
    setLoading(true);
    try {
      const result = await getConnections(environmentId);
      setConnections(result);
    } catch {
      toast.error("Failed to refresh connections");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(connection: ConnectionInfo) {
    const result = await deleteConnection(connection.id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setConnections((prev) => prev.filter((c) => c.id !== connection.id));
    toast.success(`${providerConfig[connection.providerCode]?.label ?? connection.providerCode} connection removed`);
    setDeleteTarget(null);
  }

  return (
    <div className="lg:col-span-3 md:col-span-2 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>{headerSubtitle}</CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled={loading} onClick={refresh}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No connected accounts yet. Use the API to connect a provider.
            </p>
          ) : (
            <div className="divide-y">
              {connections.map((conn) => {
                const config = providerConfig[conn.providerCode] ?? {
                  label: conn.providerCode,
                  className: "bg-gray-100 text-gray-800 border-gray-200",
                };
                return (
                  <div key={conn.id} className="flex items-center gap-4 py-3 text-sm">
                    <Badge className={config.className}>{config.label}</Badge>
                    <span className="min-w-0 flex-1 truncate">{conn.email}</span>
                    <span className="hidden sm:block text-muted-foreground truncate max-w-[120px]">
                      {conn.identifier}
                    </span>
                    <span className="hidden md:block text-muted-foreground font-mono text-xs truncate max-w-[100px]">
                      {conn.id}
                    </span>
                    <span className="hidden lg:block text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(conn.updatedAt).toLocaleDateString()}
                    </span>
                    <AlertDialog
                      open={deleteTarget?.id === conn.id}
                      onOpenChange={(open) => {
                        if (!open) setDeleteTarget(null);
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive ml-auto shrink-0"
                          onClick={() => setDeleteTarget(conn)}
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove connection?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the {config.label} connection for{" "}
                            <strong>{conn.email}</strong> (identifier:{" "}
                            <strong>{conn.identifier}</strong>). The user will need to
                            reconnect to use this provider again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(conn)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
