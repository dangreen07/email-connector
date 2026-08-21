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
import { Copy } from "lucide-react";
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

  const handleCopy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {}
  };

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="w-24 px-2 py-2 text-left font-medium">Provider</th>
                  <th className="px-2 py-2 text-left font-medium">Email</th>
                  <th className="w-[170px] hidden sm:table-cell px-2 py-2 text-left font-medium">
                    Identifier
                  </th>
                  <th className="w-[150px] hidden md:table-cell px-2 py-2 text-left font-medium">
                    Connection ID
                  </th>
                  <th className="hidden lg:table-cell px-2 py-2 text-right font-medium">
                    Updated
                  </th>
                  <th className="w-20 px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {connections.map((conn) => {
                  const config = providerConfig[conn.providerCode] ?? {
                    label: conn.providerCode,
                    className: "bg-gray-100 text-gray-800 border-gray-200",
                  };
                  return (
                    <tr key={conn.id}>
                      <td className="px-2 py-3 align-middle">
                        <Badge className={config.className}>{config.label}</Badge>
                      </td>
                      <td className="w-full max-w-0 px-2 py-3 align-middle">
                        <button
                          type="button"
                          title="Copy email"
                          onClick={() =>
                            handleCopy(conn.email, "Copied email to clipboard!")
                          }
                          className="group flex items-center gap-1.5 text-left transition-colors"
                        >
                          <span className="min-w-0 truncate">{conn.email}</span>
                          <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="w-[170px] hidden sm:table-cell px-2 py-3 align-middle">
                        <button
                          type="button"
                          title="Copy identifier"
                          onClick={() =>
                            handleCopy(conn.identifier, "Copied identifier to clipboard!")
                          }
                          className="group flex items-center gap-1.5 text-left text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="min-w-0 truncate">{conn.identifier}</span>
                          <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="w-[150px] hidden md:table-cell px-2 py-3 align-middle">
                        <button
                          type="button"
                          title="Copy connection ID"
                          onClick={() =>
                            handleCopy(conn.id, "Copied connection ID to clipboard!")
                          }
                          className="group flex items-center gap-1.5 text-left font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="min-w-0 truncate">{conn.id}</span>
                          <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap px-2 py-3 text-right align-middle text-xs text-muted-foreground">
                        {new Date(conn.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
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
                              className="text-destructive hover:text-destructive"
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
