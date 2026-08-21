"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Copy, Loader2, Play } from "lucide-react";

type Method = "GET" | "POST" | "DELETE";

type ParamKind = "text" | "number" | "select";

type EndpointParam = {
  name: string;
  label: string;
  required: boolean;
  kind: ParamKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
};

type ApiEndpoint = {
  id: string;
  method: Method;
  path: string;
  tag: "Connections" | "Messages" | "Providers";
  summary: string;
  auth: "publishable" | "secret" | "none";
  params: EndpointParam[];
  sampleBody?: unknown;
};

const SMTP_SAMPLE_BODY = {
  smtpServer: "smtp.example.com",
  smtpPort: 587,
  imapServer: "imap.example.com",
  imapPort: 993,
  email: "user@example.com",
  password: "app-password",
  useSSL: true,
};

const SEND_EMAIL_SAMPLE_BODY = {
  to: ["example@example.com"],
  subject: "Hello from MailLink",
  bodies: [
    { contentType: "text", content: "Sent via the MailLink API Playground" },
  ],
};

const ENDPOINTS: ApiEndpoint[] = [
  {
    id: "create-connection",
    method: "POST",
    path: "/v1/connection",
    tag: "Connections",
    summary: "Start a provider connection (returns an OAuth link, or connects SMTP/IMAP directly)",
    auth: "publishable",
    params: [
      {
        name: "providerCode",
        label: "Provider",
        required: true,
        kind: "select",
        options: [
          { value: "outlook", label: "Outlook" },
          { value: "gmail", label: "Gmail" },
          { value: "smtp-imap", label: "SMTP/IMAP" },
        ],
      },
      {
        name: "identifier",
        label: "Identifier",
        required: true,
        kind: "text",
        placeholder: "user-123",
        description: "Your app-specific identifier for the account being connected.",
      },
      {
        name: "redirectAfterAuth",
        label: "Redirect after auth",
        required: true,
        kind: "text",
        placeholder: "https://yourapp.com/oauth/callback",
      },
    ],
    sampleBody: SMTP_SAMPLE_BODY,
  },
  {
    id: "list-connections",
    method: "GET",
    path: "/v1/connections",
    tag: "Connections",
    summary: "List all connections in this environment",
    auth: "secret",
    params: [],
  },
  {
    id: "get-connection",
    method: "GET",
    path: "/v1/connection",
    tag: "Connections",
    summary: "Get connection(s) by identifier or id",
    auth: "secret",
    params: [
      {
        name: "identifier",
        label: "Identifier",
        required: false,
        kind: "text",
        placeholder: "user-123",
        description: "Provide either identifier or id.",
      },
      {
        name: "id",
        label: "Connection id",
        required: false,
        kind: "text",
        placeholder: "uuid",
      },
    ],
  },
  {
    id: "delete-connection",
    method: "DELETE",
    path: "/v1/connection",
    tag: "Connections",
    summary: "Delete a connection and its stored credentials",
    auth: "secret",
    params: [
      {
        name: "id",
        label: "Connection id",
        required: true,
        kind: "text",
        placeholder: "uuid",
      },
    ],
  },
  {
    id: "list-messages",
    method: "GET",
    path: "/v1/messages",
    tag: "Messages",
    summary: "List messages for a connected account",
    auth: "secret",
    params: [
      {
        name: "identifier",
        label: "Identifier",
        required: true,
        kind: "text",
        placeholder: "user-123",
      },
      {
        name: "providerCode",
        label: "Provider",
        required: true,
        kind: "select",
        options: [
          { value: "outlook", label: "Outlook" },
          { value: "gmail", label: "Gmail" },
          { value: "smtp-imap", label: "SMTP/IMAP" },
        ],
      },
      {
        name: "limit",
        label: "Limit",
        required: false,
        kind: "number",
        placeholder: "10",
      },
    ],
  },
  {
    id: "get-message-by-id",
    method: "GET",
    path: "/v1/messages/by-id",
    tag: "Messages",
    summary: "Fetch a single message by its API message id",
    auth: "secret",
    params: [
      {
        name: "id",
        label: "Message id",
        required: true,
        kind: "text",
        placeholder: "Opaque id returned by list/send endpoints",
      },
    ],
  },
  {
    id: "send-message",
    method: "POST",
    path: "/v1/messages",
    tag: "Messages",
    summary: "Send an email via a connected account",
    auth: "secret",
    params: [
      {
        name: "identifier",
        label: "Identifier",
        required: true,
        kind: "text",
        placeholder: "user-123",
      },
      {
        name: "providerCode",
        label: "Provider",
        required: true,
        kind: "select",
        options: [
          { value: "outlook", label: "Outlook" },
          { value: "gmail", label: "Gmail" },
          { value: "smtp-imap", label: "SMTP/IMAP" },
        ],
      },
    ],
    sampleBody: SEND_EMAIL_SAMPLE_BODY,
  },
  {
    id: "delete-message-by-id",
    method: "DELETE",
    path: "/v1/messages/by-id",
    tag: "Messages",
    summary: "Delete a message by its API message id",
    auth: "secret",
    params: [
      {
        name: "id",
        label: "Message id",
        required: true,
        kind: "text",
        placeholder: "Opaque id returned by list/send endpoints",
      },
    ],
  },
  {
    id: "list-providers",
    method: "GET",
    path: "/v1/providers",
    tag: "Providers",
    summary: "List supported providers",
    auth: "none",
    params: [],
  },
];

const TAGS: ApiEndpoint["tag"][] = ["Connections", "Messages", "Providers"];

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

function formatBody(text: string): string {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function isUrl(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (isUrl(value)) {
    return (
      <a
        href={value as string}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all hover:opacity-80"
      >
        {value as string}
      </a>
    );
  }
  if (typeof value === "object") {
    return (
      <pre className="max-h-40 overflow-auto rounded bg-muted/40 p-1.5 text-xs font-mono whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="break-all">{String(value)}</span>;
}

function flattenCell(value: unknown): unknown {
  if (
    Array.isArray(value) &&
    value.every((v) => typeof v !== "object" || v === null)
  ) {
    return value.length ? value.join(", ") : null;
  }
  return value;
}

function ResponseTable({ data, title }: { data: unknown; title?: string }) {
  let rowsData: unknown = data;
  let label = title;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 1 && entries[0][1] !== null && typeof entries[0][1] === "object") {
      label = entries[0][0];
      rowsData = entries[0][1];
    }
  }

  if (Array.isArray(rowsData)) {
    const isObjectArray =
      rowsData.length > 0 &&
      rowsData.every(
        (row) => row !== null && typeof row === "object" && !Array.isArray(row)
      );

    if (isObjectArray) {
      const columns: string[] = [];
      (rowsData as Record<string, unknown>[]).forEach((row) => {
        Object.keys(row).forEach((k) => {
          if (!columns.includes(k)) columns.push(k);
        });
      });
      return (
        <div className="space-y-1">
          {label && (
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label} ({rowsData.length})
            </div>
          )}
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-max w-full text-sm table-auto">
              <thead className="bg-muted/50 text-left">
                <tr className="border-b">
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rowsData as Record<string, unknown>[]).map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30 align-top">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 max-w-[24rem]">
                        <CellValue value={flattenCell(row[col])} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {label && (
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label} ({rowsData.length})
          </div>
        )}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm table-auto">
            <thead className="bg-muted/50 text-left">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rowsData.map((row, i) => (
                <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <CellValue value={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (rowsData !== null && typeof rowsData === "object") {
    const entries = Object.entries(rowsData as Record<string, unknown>);
    return (
      <div className="space-y-1">
        {label && (
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        )}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm table-auto">
            <thead className="bg-muted/50 text-left">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium w-48">Key</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} className="border-b last:border-b-0 hover:bg-muted/30 align-top">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {key}
                  </td>
                  <td className="px-3 py-2 max-w-[32rem]">
                    <CellValue value={flattenCell(value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm table-auto">
        <thead className="bg-muted/50 text-left">
          <tr className="border-b">
            <th className="px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2">
              <CellValue value={rowsData} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type PlaygroundResponse =
  | {
      kind: "response";
      status: number;
      statusText: string;
      ok: boolean;
      durationMs: number;
      bodyText: string;
    }
  | {
      kind: "error";
      message: string;
      durationMs: number;
    };

export default function ApiPlayground() {
  const {
    publishableKey,
    secretKey,
    outlookEnabled,
    gmailEnabled,
    imapEnabled,
  } = useDashboardStore((s) => s);

  const [selectedId, setSelectedId] = useState("list-connections");
  const [paramValues, setParamValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [bodyValues, setBodyValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    "connection" | "message" | null
  >(null);
  const [viewMode, setViewMode] = useState<"json" | "table">("json");

  const endpoint = useMemo(
    () => ENDPOINTS.find((e) => e.id === selectedId) ?? ENDPOINTS[0],
    [selectedId]
  );

  const providerOptions = useMemo(
    () => [
      {
        value: "outlook",
        label: outlookEnabled ? "Outlook" : "Outlook (not enabled)",
      },
      {
        value: "gmail",
        label: gmailEnabled ? "Gmail" : "Gmail (not enabled)",
      },
      {
        value: "smtp-imap",
        label: imapEnabled ? "SMTP/IMAP" : "SMTP/IMAP (not enabled)",
      },
    ],
    [outlookEnabled, gmailEnabled, imapEnabled]
  );

  const resolvedEndpoint = useMemo<ApiEndpoint>(
    () =>
      endpoint.params.some((p) => p.name === "providerCode")
        ? { ...endpoint, params: endpoint.params.map((p) => p.kind === "select" && p.name === "providerCode" ? { ...p, options: providerOptions } : p) }
        : endpoint,
    [endpoint, providerOptions]
  );

  const getParam = (name: string) => paramValues[endpoint.id]?.[name] ?? "";

  const setParam = (name: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [endpoint.id]: { ...prev[endpoint.id], [name]: value },
    }));
    if (endpoint.id === "create-connection" && name === "providerCode") {
      setBodyValues((prev) => ({
        ...prev,
        [endpoint.id]: JSON.stringify(
          value === "smtp-imap" ? SMTP_SAMPLE_BODY : {},
          null,
          2
        ),
      }));
    }
  };

  const activeSampleBody =
    endpoint.id === "create-connection"
      ? getParam("providerCode") === "smtp-imap"
        ? SMTP_SAMPLE_BODY
        : {}
      : endpoint.sampleBody;

  const getBody = () => {
    const existing = bodyValues[endpoint.id];
    if (existing !== undefined) return existing;
    return activeSampleBody !== undefined
      ? JSON.stringify(activeSampleBody, null, 2)
      : "";
  };

  const setBody = (value: string) =>
    setBodyValues((prev) => ({ ...prev, [endpoint.id]: value }));

  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "").replace(
    /\/$/,
    ""
  );

  const authKey =
    endpoint.auth === "publishable"
      ? publishableKey
      : endpoint.auth === "secret"
      ? secretKey
      : "";

  const buildUrl = () => {
    const qs = new URLSearchParams();
    resolvedEndpoint.params.forEach((p) => {
      const v = getParam(p.name).trim();
      if (v) qs.set(p.name, v);
    });
    const query = qs.toString();
    return `${baseUrl}${resolvedEndpoint.path}${query ? `?${query}` : ""}`;
  };

  const buildCurl = () => {
    const parts = [`curl -X ${endpoint.method} '${buildUrl()}'`];
    if (authKey) parts.push(`-H 'Authorization: Bearer ${authKey}'`);
    if (activeSampleBody !== undefined) {
      const bodyStr = getBody().trim();
      if (bodyStr) {
        parts.push(`-H 'Content-Type: application/json'`);
        parts.push(`-d '${bodyStr.replace(/'/g, "'\\''")}'`);
      }
    }
    return parts.join(" \\\n  ");
  };

  async function copyCurl() {
    try {
      await navigator.clipboard.writeText(buildCurl());
      toast("Copied request as cURL to clipboard!");
    } catch {}
  }

  function validate(): string | null {
    const missing = resolvedEndpoint.params
      .filter((p) => p.required && !getParam(p.name).trim())
      .map((p) => p.label);
    if (missing.length)
      return `Missing required parameter${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`;
    if (activeSampleBody !== undefined) {
      const bodyStr = getBody().trim();
      if (bodyStr) {
        try {
          JSON.parse(bodyStr);
        } catch {
          return "Request body is not valid JSON";
        }
      }
    }
    return null;
  }

  async function send() {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const url = buildUrl();
    const headers: Record<string, string> = {};
    if (authKey) headers.Authorization = `Bearer ${authKey}`;

    let bodyStr: string | undefined;
    if (activeSampleBody !== undefined) {
      const trimmed = getBody().trim();
      if (trimmed) {
        headers["Content-Type"] = "application/json";
        bodyStr = trimmed;
      }
    }

    setSending(true);
    setResponse(null);
    const started = performance.now();
    try {
      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body: bodyStr,
      });
      const durationMs = Math.round(performance.now() - started);
      const text = await res.text();
      setResponse({
        kind: "response",
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        durationMs,
        bodyText: text,
      });
    } catch (err) {
      setResponse({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network request failed. Is the backend running?",
        durationMs: Math.round(performance.now() - started),
      });
    } finally {
      setSending(false);
      setConfirmDelete(null);
    }
  }

  function onSendClick() {
    if (endpoint.id === "delete-connection") {
      setConfirmDelete("connection");
      return;
    }
    if (endpoint.id === "delete-message-by-id") {
      setConfirmDelete("message");
      return;
    }
    send();
  }

  const parsedResponse = useMemo(() => {
    if (response?.kind !== "response" || !response.bodyText) return null;
    try {
      return { ok: true as const, data: JSON.parse(response.bodyText) };
    } catch {
      return { ok: false as const, data: null };
    }
  }, [response]);

  const hasBody = response?.kind === "response" && !!response.bodyText;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
      <Card className="py-0">
        <CardContent className="px-3 py-3">
          <div className="space-y-4">
            {TAGS.map((tag) => (
              <div key={tag}>
                <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tag}
                </div>
                <div className="space-y-1">
                  {ENDPOINTS.filter((e) => e.tag === tag).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors",
                        e.id === selectedId && "bg-accent"
                      )}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] px-1.5 shrink-0",
                          METHOD_STYLES[e.method]
                        )}
                      >
                        {e.method}
                      </Badge>
                      <span className="font-mono text-xs truncate">
                        {e.path}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 min-w-0">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("font-mono", METHOD_STYLES[endpoint.method])}
              >
                {endpoint.method}
              </Badge>
              <CardTitle className="font-mono text-base">
                {endpoint.path}
              </CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {endpoint.auth === "none"
                  ? "No auth"
                  : endpoint.auth === "publishable"
                  ? "Publishable key"
                  : "Secret key"}
              </Badge>
            </div>
            <CardDescription>{endpoint.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoint.params.length > 0 && (
              <div className="space-y-3">
                {resolvedEndpoint.params.map((p) => (
                  <div key={p.name} className="space-y-1.5">
                    <Label htmlFor={`param-${p.name}`}>
                      {p.label}
                      {p.required ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          (optional)
                        </span>
                      )}
                    </Label>
                    {p.kind === "select" ? (
                      <Select
                        value={getParam(p.name)}
                        onValueChange={(v) => setParam(p.name, v)}
                      >
                        <SelectTrigger id={`param-${p.name}`} className="w-full md:w-64">
                          <SelectValue placeholder={`Select ${p.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(p.options ?? []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`param-${p.name}`}
                        type={p.kind === "number" ? "number" : "text"}
                        value={getParam(p.name)}
                        onChange={(e) => setParam(p.name, e.target.value)}
                        placeholder={p.placeholder}
                        className="font-mono"
                      />
                    )}
                    {p.description && (
                      <p className="text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeSampleBody !== undefined && (
              <div className="space-y-1.5">
                <Label htmlFor="request-body">
                  Request body{" "}
                  <span className="text-muted-foreground text-xs">(JSON)</span>
                </Label>
                <Textarea
                  id="request-body"
                  value={getBody()}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="rounded-md border bg-muted/40 px-3 py-2 overflow-x-auto">
              <code className="font-mono text-xs break-all whitespace-pre-wrap">
                {buildUrl()}
              </code>
            </div>

            {endpoint.auth !== "none" && !authKey && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No {endpoint.auth} key found for this environment.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={onSendClick} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play />
                    Send
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={copyCurl}>
                <Copy />
                Copy as cURL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Response</CardTitle>
              {response?.kind === "response" && (
                <>
                  <Badge
                    variant={response.ok ? "default" : "destructive"}
                    className={cn(
                      response.ok &&
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 border"
                    )}
                  >
                    {response.status} {response.statusText}
                  </Badge>
                  <Badge variant="secondary">{response.durationMs} ms</Badge>
                </>
              )}
              {response?.kind === "error" && (
                <Badge variant="destructive">Network error</Badge>
              )}
              {hasBody && (
                <div className="ml-auto flex items-center rounded-md border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("json")}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === "json"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      viewMode === "table"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Table
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!response ? (
              <p className="text-sm text-muted-foreground">
                Send a request to see the response here.
              </p>
            ) : response.kind === "error" ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{response.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Failed after {response.durationMs} ms
                </p>
              </div>
            ) : response.bodyText ? (
              viewMode === "json" ? (
                <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {formatBody(response.bodyText)}
                </pre>
              ) : parsedResponse?.ok ? (
                <div className="max-h-96 overflow-auto">
                  <ResponseTable data={parsedResponse.data} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Response is not valid JSON — switch to JSON view to see it.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                No content returned ({response.status}) in {response.durationMs}{" "}
                ms
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete === "message"
                ? "Delete message?"
                : "Delete connection?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === "message"
                ? "This moves the message to the provider's trash. This action cannot be undone."
                : "This permanently deletes the connection and its stored credentials. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => send()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
