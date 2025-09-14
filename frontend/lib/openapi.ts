/* eslint-disable @typescript-eslint/no-explicit-any */

// Minimal helpers to work with OpenAPI 3.0/3.1 specs for a custom docs UI

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  /**
   * Optional human-friendly usage notes added via the OpenAPI spec vendor extension `x-usage`.
   * This field is shown in the docs UI to give step-by-step usage guidance for the endpoint.
   */
  usage?: string;
  tags: string[];
  parameters: any[];
  requestSchema?: any;
  requestExample?: any;
  responses: {
    status: string;
    description?: string;
    schema?: any;
    example?: any;
  }[];
  security: "publishable" | "secret" | "none";
}

export interface TagGroup {
  tag: string;
  endpoints: Endpoint[];
  description?: string;
}

export function isHttpMethod(k: string): k is HttpMethod {
  return ["get", "post", "put", "patch", "delete", "options", "head"].includes(
    k.toLowerCase()
  );
}

export function resolveRef(spec: any, schemaOrRef: any): any {
  if (!schemaOrRef) return schemaOrRef;
  if (!schemaOrRef.$ref) return schemaOrRef;
  const ref: string = schemaOrRef.$ref;
  if (!ref.startsWith("#/")) return schemaOrRef;
  const path = ref
    .slice(2)
    .split("/")
    .map((p) => decodeURIComponent(p));
  let cur: any = spec;
  for (const p of path) {
    if (cur == null) break;
    cur = cur[p];
  }
  if (!cur) return schemaOrRef;
  if (cur.$ref) return resolveRef(spec, cur);
  return cur;
}

export function getServerUrl(spec: any): string {
  return spec?.servers?.[0]?.url ?? "";
}

export function getAuthKindForOperation(
  spec: any,
  operation: any
): "publishable" | "secret" | "none" {
  const sec: any[] | undefined = operation?.security ?? spec?.security;
  if (!sec || !Array.isArray(sec) || sec.length === 0) return "none";
  for (const req of sec) {
    const keys = Object.keys(req || {});
    if (keys.includes("PublishableKeyAuth")) return "publishable";
    if (keys.includes("SecretKeyAuth")) return "secret";
  }
  return "none";
}

export function mergeParameters(
  pathParams: any[] = [],
  opParams: any[] = []
): any[] {
  const result: any[] = [];
  const key = (p: any) => `${p?.in || ""}:${p?.name || ""}`;
  const seen = new Set<string>();
  for (const p of [...opParams, ...pathParams]) {
    if (!p) continue;
    const k = key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(p);
  }
  return result;
}

export function extractRequestSchemaAndExample(
  spec: any,
  operation: any
): { schema?: any; example?: any } {
  const rb = operation?.requestBody;
  if (!rb?.content) return {};
  const content =
    rb.content["application/json"] ?? Object.values(rb.content)[0];
  if (!content) return {};
  let schema = content.schema;
  if (schema) schema = resolveRef(spec, schema);
  const example = content.example ?? firstExampleValue(content.examples);
  return { schema, example };
}

export function extractResponseSet(
  spec: any,
  operation: any
): { status: string; description?: string; schema?: any; example?: any }[] {
  const responses = operation?.responses || {};
  const out: {
    status: string;
    description?: string;
    schema?: any;
    example?: any;
  }[] = [];
  for (const status of Object.keys(responses)) {
    const r = responses[status];
    const description: string | undefined = r?.description;
    let schema: any | undefined;
    let example: any | undefined;
    const content =
      r?.content?.["application/json"] ?? firstContent(r?.content);
    if (content) {
      if (content.schema) schema = resolveRef(spec, content.schema);
      example = content.example ?? firstExampleValue(content.examples);
    }
    out.push({ status, description, schema, example });
  }
  return out.sort((a, b) => a.status.localeCompare(b.status));
}

function firstContent(content: any): any | undefined {
  if (!content) return undefined;
  const firstKey = Object.keys(content)[0];
  return firstKey ? content[firstKey] : undefined;
}

function firstExampleValue(examples: any): any | undefined {
  if (!examples) return undefined;
  if (Array.isArray(examples)) {
    const e = examples[0];
    if (!e) return undefined;
    return (e as any).value ?? (e as any).externalValue;
  }
  const firstKey = Object.keys(examples)[0];
  if (!firstKey) return undefined;
  const ex = examples[firstKey];
  return ex?.value ?? ex?.externalValue;
}

export function listOperations(spec: any): {
  tagGroups: TagGroup[];
  endpointsById: Record<string, Endpoint>;
  tagInfo: Record<string, { description?: string }>;
} {
  const groupsMap = new Map<string, Endpoint[]>();
  const endpointsById: Record<string, Endpoint> = {};
  const tagInfo: Record<string, { description?: string }> = {};

  for (const t of spec?.tags ?? []) {
    tagInfo[t.name] = { description: t.description };
  }

  const paths = spec?.paths || {};
  for (const pathKey of Object.keys(paths)) {
    const pathItem = paths[pathKey] || {};
    const pathLevelParams: any[] = pathItem.parameters || [];
    for (const maybeMethod of Object.keys(pathItem)) {
      if (!isHttpMethod(maybeMethod)) continue;
      const method = maybeMethod.toLowerCase() as HttpMethod;
      const operation = pathItem[maybeMethod] || {};
      const tags: string[] =
        operation.tags && operation.tags.length > 0
          ? operation.tags
          : ["General"];
      const summary: string | undefined = operation.summary;
      const description: string | undefined = operation.description;
      const opParams: any[] = operation.parameters || [];
      const parameters = mergeParameters(pathLevelParams, opParams);

      const { schema: requestSchema, example: requestExample } =
        extractRequestSchemaAndExample(spec, operation);
      const responses = extractResponseSet(spec, operation);
      const security = getAuthKindForOperation(spec, operation);

      // Support an optional vendor extension `x-usage` on operations to provide
      // explicit usage guidance (human-readable) for display in the docs UI.
      // Example in spec:
      // x-usage: |
      //   1) Call this endpoint with Publishable Key to obtain an authUrl.
      //   2) Redirect the user to authUrl to complete OAuth.
      const usage: string | undefined =
        operation["x-usage"] ?? operation["x-usage-text"] ?? undefined;

      const id = `${method.toUpperCase()} ${pathKey}`;
      const endpoint: Endpoint = {
        id,
        method,
        path: pathKey,
        summary,
        description,
        usage,
        tags,
        parameters,
        requestSchema,
        requestExample,
        responses,
        security,
      };

      for (const tag of tags) {
        if (!groupsMap.has(tag)) groupsMap.set(tag, []);
        groupsMap.get(tag)!.push(endpoint);
      }
      endpointsById[id] = endpoint;
    }
  }

  const tagGroups: TagGroup[] = [...groupsMap.entries()]
    .map(([tag, endpoints]) => ({
      tag,
      endpoints: endpoints.sort((a, b) =>
        a.path === b.path
          ? a.method.localeCompare(b.method)
          : a.path.localeCompare(b.path)
      ),
      description: tagInfo[tag]?.description,
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return { tagGroups, endpointsById, tagInfo };
}

export function generateExampleFromSchema(
  schema: any,
  spec: any,
  depth = 0
): any {
  if (!schema || depth > 6) return null;
  schema = resolveRef(spec, schema);
  if (!schema) return null;

  if (schema.example !== undefined) return schema.example;

  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const choice = (schema.oneOf || schema.anyOf || [])[0] ?? {};
    const base = generateExampleFromSchema(choice, spec, depth + 1);
    if (schema.allOf) {
      for (const part of schema.allOf) {
        const resolved = resolveRef(spec, part);
        if (resolved?.properties) {
          Object.assign(
            base ?? {},
            generateExampleFromSchema(resolved, spec, depth + 1)
          );
        }
      }
    }
    return base;
  }

  switch (schema.type) {
    case "object": {
      const out: any = {};
      const props = schema.properties || {};
      const required: string[] = schema.required || [];
      for (const key of Object.keys(props)) {
        const val = generateExampleFromSchema(props[key], spec, depth + 1);
        if (val !== null && (required.includes(key) || depth < 2)) {
          out[key] = val;
        }
      }
      return out;
    }
    case "array": {
      const item = generateExampleFromSchema(schema.items, spec, depth + 1);
      return [item ?? null];
    }
    case "string":
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "email") return "user@example.com";
      if (schema.enum?.length) return schema.enum[0];
      return "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    default:
      if (schema.enum?.length) return schema.enum[0];
      return null;
  }
}

export function buildCurlSample(serverUrl: string, ep: Endpoint): string {
  const url = new URL((serverUrl || "").replace(/\/$/, "") + ep.path);
  const qp = (ep.parameters || []).filter((p) => p.in === "query");
  for (const p of qp) {
    url.searchParams.set(p.name, p.required ? `<${p.name}>` : `{${p.name}}`);
  }

  const headers: string[] = ['-H "Content-Type: application/json"'];
  if (ep.security === "publishable")
    headers.push('-H "Authorization: Bearer pk_xxx"');
  if (ep.security === "secret")
    headers.push('-H "Authorization: Bearer sk_xxx"');

  let body = "";
  const payload =
    ep.requestExample ?? generateExampleFromSchema(ep.requestSchema, {} as any);
  if (payload && ["post", "put", "patch"].includes(ep.method)) {
    body = ` \\\n  -d '${JSON.stringify(payload, null, 2)}'`;
  }

  return `curl -X ${ep.method.toUpperCase()} "${url.toString()}" \\\n  ${headers.join(
    " \\\n  "
  )}${body}`;
}

export function buildNodeFetchSample(serverUrl: string, ep: Endpoint): string {
  const url = new URL((serverUrl || "").replace(/\/$/, "") + ep.path);
  const qp = (ep.parameters || []).filter((p) => p.in === "query");
  for (const p of qp) {
    url.searchParams.set(
      p.name,
      p.required ? `\${${p.name}}` : `\${${p.name} ?? ''}`
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ep.security === "publishable") headers["Authorization"] = "Bearer pk_xxx";
  if (ep.security === "secret") headers["Authorization"] = "Bearer sk_xxx";

  const payload =
    ep.requestExample ?? generateExampleFromSchema(ep.requestSchema, {} as any);
  const needsBody = payload && ["post", "put", "patch"].includes(ep.method);

  const qpDecl = qp.length
    ? `const { ${qp.map((p) => p.name).join(", ")} } = /* your values */ {};\n`
    : "";

  return `${qpDecl}const res = await fetch(\`${url.toString()}\`, {
  method: '${ep.method.toUpperCase()}',
  headers: ${JSON.stringify(headers, null, 2)},
  ${
    needsBody
      ? `body: JSON.stringify(${JSON.stringify(payload, null, 2)}),`
      : ""
  }
});
const data = await res.json();`;
}
