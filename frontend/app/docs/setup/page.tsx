import Link from "next/link";

export default function SetupDocs() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-12">
      <div className="mb-4 text-sm">
        <Link href="/docs" className="text-sm text-primary underline">
          ← Back to docs
        </Link>
      </div>
      <h1 className="text-3xl font-semibold mb-6">Setup & Deployment</h1>

      <p className="mb-4 text-sm text-muted-foreground">
        Guides for preparing the google and azure for MailLink production environments. Pick a
        cloud provider below for step-by-step instructions.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/docs/setup/google-cloud"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">Google Cloud</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructions for setting up google cloud for production MailLink environments
          </p>
        </Link>

        <Link
          href="/docs/setup/azure"
          className="block rounded-lg border p-4 hover:shadow"
        >
          <h2 className="text-lg font-medium">Azure</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructions for setting up azure for production MailLink environments
          </p>
        </Link>
      </div>
    </div>
  );
}
