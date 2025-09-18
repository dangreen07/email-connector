import Link from "next/link";

export default function DocsIndex() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Documentation</h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Choose which docs you&apos;d like to view.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/docs/api-reference"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">API Reference</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the OpenAPI reference for endpoints, request/response
            examples, and code samples.
          </p>
        </Link>

        <Link
          href="/docs/setup"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">Setup & Deployment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Guides to set up production environments (Google Cloud, Azure) and
            deployment recommendations.
          </p>
        </Link>
      </div>
    </div>
  );
}
