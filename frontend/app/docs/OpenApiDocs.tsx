"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import YAML from "yaml";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Endpoint,
  TagGroup,
  listOperations,
  getServerUrl,
  buildCurlSample,
  buildNodeFetchSample,
  HttpMethod,
} from "@/lib/openapi";

type SpecInfo = {
  title?: string;
  version?: string;
  description?: string;
};

const methodColor: Record<HttpMethod, string> = {
  get: "bg-emerald-500 text-white",
  post: "bg-sky-600 text-white",
  put: "bg-amber-600 text-white",
  patch: "bg-yellow-600 text-white",
  delete: "bg-rose-600 text-white",
  options: "bg-gray-600 text-white",
  head: "bg-gray-600 text-white",
};

function MethodPill({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase ${methodColor[method]}`}
    >
      {method}
    </span>
  );
}

function SecurityBadge({ kind }: { kind: Endpoint["security"] }) {
  if (kind === "none") return null;
  const label = kind === "publishable" ? "Publishable key" : "Secret key";
  const color =
    kind === "publishable"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
      : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function FieldBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {text}
    </span>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }, [text]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onCopy}
      className={className}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CodeBlock({
  code,
  lang = "bash",
  allowCopy = true,
}: {
  code: string;
  lang?: "bash" | "ts" | "js" | "json";
  allowCopy?: boolean;
}) {
  return (
    <div className="relative">
      {allowCopy ? (
        <CopyButton text={code} className="absolute right-3 top-3" />
      ) : null}
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const code = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "// Unable to render JSON example";
    }
  }, [value]);
  return <CodeBlock code={code} lang="json" />;
}

function EndpointParameters({ ep }: { ep: Endpoint }) {
  if (!ep.parameters || ep.parameters.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parameters</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 text-left font-medium">Name</th>
              <th className="py-2 pr-4 text-left font-medium">In</th>
              <th className="py-2 pr-4 text-left font-medium">Type</th>
              <th className="py-2 pr-4 text-left font-medium">Required</th>
              <th className="py-2 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {ep.parameters.map((p, idx) => {
              const type = p?.schema?.type ?? (p?.schema?.enum ? "enum" : "");
              return (
                <tr key={idx} className="border-t">
                  <td className="py-2 pr-4 align-top">
                    <code className="rounded bg-muted px-1.5 py-0.5">
                      {p.name}
                    </code>
                  </td>
                  <td className="py-2 pr-4 align-top">{p.in}</td>
                  <td className="py-2 pr-4 align-top">{type}</td>
                  <td className="py-2 pr-4 align-top">
                    {p.required ? "Yes" : "No"}
                  </td>
                  <td className="py-2 align-top">{p.description ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function EndpointRequest({ ep }: { ep: Endpoint }) {
  if (!ep.requestSchema && !ep.requestExample) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request body</CardTitle>
      </CardHeader>
      <CardContent>
        <JsonBlock value={ep.requestExample ?? {}} />
      </CardContent>
    </Card>
  );
}

function EndpointResponses({ ep }: { ep: Endpoint }) {
  if (!ep.responses || ep.responses.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Responses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ep.responses.map((r) => (
          <div key={r.status}>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{r.status}</Badge>
              {r.description ? (
                <span className="text-sm text-muted-foreground">
                  {r.description}
                </span>
              ) : null}
            </div>
            {r.example !== undefined ? <JsonBlock value={r.example} /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EndpointSamples({
  serverUrl,
  ep,
}: {
  serverUrl: string;
  ep: Endpoint;
}) {
  const curl = useMemo(() => buildCurlSample(serverUrl, ep), [serverUrl, ep]);
  const node = useMemo(
    () => buildNodeFetchSample(serverUrl, ep),
    [serverUrl, ep]
  );
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Code samples</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="curl" className="w-full">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="node">Node</TabsTrigger>
          </TabsList>
          <TabsContent value="curl">
            <CodeBlock code={curl} lang="bash" />
          </TabsContent>
          <TabsContent value="node">
            <CodeBlock code={node} lang="ts" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Small markdown-to-HTML helper for lightweight MD used in `x-usage`.
 * Supports:
 * - fenced code blocks (```...```)
 * - bold with **bold**
 * - inline code with `code`
 * - unordered lists (- or *)
 * - ordered lists (1. ...)
 * - paragraphs
 *
 * This is intentionally small and safe: it escapes HTML and only supports
 * the subset needed for usage guidance.
 */
function mdToHtml(md: string) {
  if (!md) return "";
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");

  // Normalize line endings
  md = md.replace(/\r\n/g, "\n");

  // Handle fenced code blocks first
  md = md.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="not-prose"><code>${escapeHtml(code)}</code></pre>`;
  });

  // Inline code
  md = md.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  md = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Process lines for lists and paragraphs
  const lines = md.split("\n");
  let out = "";
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out += "</ul>\n";
      inUl = false;
    }
    if (inOl) {
      out += "</ol>\n";
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      closeLists();
      out += "<p></p>\n";
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    const ulMatch = line.match(/^[-*]\s+(.*)/);

    if (olMatch) {
      if (!inOl) {
        closeLists();
        out += "<ol>\n";
        inOl = true;
      }
      out += `<li>${olMatch[2]}</li>\n`;
      continue;
    }

    if (ulMatch) {
      if (!inUl) {
        closeLists();
        out += "<ul>\n";
        inUl = true;
      }
      out += `<li>${ulMatch[1]}</li>\n`;
      continue;
    }

    // Normal paragraph line
    closeLists();
    out += `<p>${line}</p>\n`;
  }

  closeLists();
  // Wrap result in a container
  return out;
}

function EndpointHeader({ ep }: { ep: Endpoint }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <MethodPill method={ep.method} />
        <code className="rounded bg-muted px-2 py-1 text-sm">{ep.path}</code>
        <SecurityBadge kind={ep.security} />
        <div className="flex flex-wrap items-center gap-1">
          {ep.tags?.map((t) => (
            <FieldBadge key={t} text={t} />
          ))}
        </div>
      </div>
      {ep.summary ? (
        <h2 className="mt-3 text-xl font-semibold">{ep.summary}</h2>
      ) : null}
      {ep.description ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {ep.description}
        </p>
      ) : null}

      {/* Render usage guidance as markdown-styled prose for readability */}
      {ep.usage ? (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usage guidance</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose max-w-none dark:prose-invert text-sm"
                dangerouslySetInnerHTML={{ __html: mdToHtml(ep.usage) }}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function OpenApiDocs() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // spec is not stored; we derive view state from parsed spec
  const [serverUrl, setServerUrl] = useState<string>("");
  const [specInfo, setSpecInfo] = useState<SpecInfo>({});
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [endpointsById, setEndpointsById] = useState<Record<string, Endpoint>>(
    {}
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/openapi.yaml", { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to load spec (${res.status})`);
        const text = await res.text();
        const parsed = YAML.parse(text);
        if (!mounted) return;
        // parsed spec loaded
        setServerUrl(getServerUrl(parsed));
        setSpecInfo({
          title: parsed?.info?.title,
          version: parsed?.info?.version,
          description: parsed?.info?.description,
        });
        const { tagGroups, endpointsById } = listOperations(parsed);
        setTagGroups(tagGroups);
        setEndpointsById(endpointsById);
        const firstTag = tagGroups[0]?.tag ?? null;
        const firstEp = tagGroups[0]?.endpoints?.[0]?.id ?? null;
        setSelectedTag(firstTag);
        setSelectedEndpointId(firstEp);
      } catch (e: unknown) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg || "Failed to load API spec");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedEndpoint: Endpoint | null = useMemo(() => {
    if (selectedEndpointId && endpointsById[selectedEndpointId]) {
      return endpointsById[selectedEndpointId];
    }
    if (!selectedTag) return null;
    const group = tagGroups.find((t) => t.tag === selectedTag);
    return group?.endpoints?.[0] ?? null;
  }, [selectedEndpointId, endpointsById, selectedTag, tagGroups]);

  const onSelectEndpoint = useCallback((tag: string, id: string) => {
    setSelectedTag(tag);
    setSelectedEndpointId(id);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-12">
        <div className="animate-pulse text-muted-foreground">
          Loading API documentation…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{err}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">
            {specInfo.title ?? "API Reference"}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {specInfo.version ? <span>v{specInfo.version}</span> : null}
            {serverUrl ? (
              <>
                <span>•</span>
                <span className="truncate">Base: {serverUrl}</span>
              </>
            ) : null}
          </div>
          {specInfo.description ? (
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {specInfo.description}
            </p>
          ) : null}
        </div>

        <Separator />

        <nav className="mt-4 space-y-5">
          {tagGroups.map((group) => (
            <div key={group.tag}>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {group.tag}
              </div>
              <ul className="space-y-1">
                {group.endpoints.map((ep) => {
                  const selected = ep.id === selectedEndpointId;
                  return (
                    <li key={ep.id}>
                      <button
                        type="button"
                        onClick={() => onSelectEndpoint(group.tag, ep.id)}
                        className={[
                          "w-full rounded-md px-2 py-1.5 text-left text-sm",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/60",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          <MethodPill method={ep.method} />
                          <span className="truncate font-medium">
                            {ep.path}
                          </span>
                        </div>
                        {ep.summary ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {ep.summary}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="min-w-0 space-y-6">
        {!selectedEndpoint ? (
          <Card>
            <CardHeader>
              <CardTitle>No endpoint selected</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Choose an endpoint from the left sidebar to see details.
            </CardContent>
          </Card>
        ) : (
          <>
            <section>
              <EndpointHeader ep={selectedEndpoint} />
              <Separator />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <EndpointParameters ep={selectedEndpoint} />
              <EndpointRequest ep={selectedEndpoint} />
            </section>

            <section>
              <EndpointResponses ep={selectedEndpoint} />
            </section>

            <section>
              <EndpointSamples serverUrl={serverUrl} ep={selectedEndpoint} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
