import Link from "next/link";

export default function SetupDocs() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Setup & Deployment</h1>

      <p className="mb-4 text-sm text-muted-foreground">
        Guides for preparing and running this application in production. Pick a
        cloud provider below for step-by-step instructions.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/docs/setup/google-cloud"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">Google Cloud</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructions for deploying to Google Cloud (Cloud Run, GKE, IAM,
            secrets, managed Postgres, Redis/memorystore).
          </p>
        </Link>

        <Link
          href="/docs/setup/azure"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">Azure</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructions for deploying to Azure (App Service / AKS, App
            Registrations, Managed Identity, storage, Redis).
          </p>
        </Link>
      </div>

      <div className="mt-8 text-sm">
        <Link href="/docs" className="text-sm text-primary underline">
          ← Back to docs
        </Link>
      </div>
    </div>
  );
}
