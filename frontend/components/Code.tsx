"use client";

import React, { useId, useState } from "react";

interface CodeProps {
  children: string | React.ReactNode;
  lang?: string;
  className?: string;
  filename?: string;
}

/**
 * Simple code block for MDX with a copy button.
 * - Renders pre/code with Tailwind styles (light/dark)
 * - If MDX/rehype already provides syntax highlighting the markup will survive.
 */
export default function Code({
  children,
  lang = "text",
  className = "",
  filename,
}: CodeProps) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  const code = typeof children === "string" ? children : String(children);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + execCommand (older browsers) could be added if needed
      setCopied(false);
    }
  }

  return (
    <div
      className={`relative my-4 text-sm rounded-md overflow-hidden border ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-600 dark:text-gray-300 uppercase font-medium">
            {lang}
          </div>
          {filename ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {filename}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Copy code"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-2 py-1 rounded border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Copy"
            type="button"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M9 12H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="9"
                y="9"
                width="11"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span className="sr-only">Copy</span>
          </button>
          <div
            aria-hidden
            className={`text-xs text-gray-500 dark:text-gray-400 w-12 text-right`}
          >
            {copied ? "Copied" : ""}
          </div>
        </div>
      </div>

      <pre
        id={id}
        className="p-4 overflow-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      >
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}
