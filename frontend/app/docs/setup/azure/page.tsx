"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

/**
 * Azure setup guide (markdown).
 * This guide explains how customers should configure Azure so our service
 * can act on behalf of their company (delegate mailbox/send permissions).
 */
export default function AzureSetup() {
  const md = `Still in Development...`;

  return (
    <div className="mx-auto max-w-screen-md px-4 py-12">
      <div className="mb-4 text-sm">
        <Link href="/docs/setup" className="text-sm text-primary underline">
          ← Back to Setup docs
        </Link>
      </div>

      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
    </div>
  );
}
