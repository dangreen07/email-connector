"use client";

import { useMemo, useState } from "react";
import type { Log } from "@/utils/db/schema";
import { getLogsPage } from "@/app/dashboard/_actions";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";

type LogsViewerProps = {
  initialLogs: Log[]; // required server-provided first page
  initialTotal: number; // required server-provided total count
};

const PAGE_SIZE = 50;
const PREVIEW_MAX = 100;

function truncate(value: string | null | undefined, max = PREVIEW_MAX) {
  if (!value) return "";
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

function makePageRange(
  current: number,
  total: number,
  maxButtons = 7
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (total <= maxButtons) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const left = Math.max(1, current - 2);
  const right = Math.min(total, current + 2);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push("...");
  }

  for (let p = left; p <= right; p++) pages.push(p);

  if (right < total) {
    if (right < total - 1) pages.push("...");
    pages.push(total);
  }

  return pages;
}

export default function LogsViewer({
  initialLogs,
  initialTotal,
}: LogsViewerProps) {
  const { environmentId } = useDashboardStore((s) => s);

  // Keep server-provided values as the initial state; no auto-refetch on mount
  const [rows, setRows] = useState<Log[]>(initialLogs);
  const rowsMemo = useMemo(() => rows, [rows]);

  const [total, setTotal] = useState<number>(initialTotal);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const [expandedQuery, setExpandedQuery] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedBody, setExpandedBody] = useState<Record<string, boolean>>({});

  const toggleQuery = (id: string) =>
    setExpandedQuery((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleBody = (id: string) =>
    setExpandedBody((prev) => ({ ...prev, [id]: !prev[id] }));

  // fetch a page when user navigates
  async function fetchPage(page: number) {
    if (!environmentId) return;
    setLoading(true);
    try {
      const res = await getLogsPage(environmentId, page, PAGE_SIZE);
      setRows(res.logs);
      setTotal(res.total);
      setCurrentPage(page);
      setExpandedQuery({});
      setExpandedBody({});
    } catch (err) {
      console.error("Failed to fetch logs page", err);
    } finally {
      setLoading(false);
    }
  }

  function goto(page: number) {
    if (page === currentPage || page < 1 || page > totalPages) return;
    fetchPage(page);
  }

  if (!rowsMemo || rowsMemo.length === 0) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        No logs found for this environment yet.
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-muted/50 text-left">
          <tr className="border-b">
            <th className="px-3 py-2 font-medium w-40">Time</th>
            <th className="px-3 py-2 font-medium w-20">Method</th>
            <th className="px-3 py-2 font-medium w-40">Route</th>
            <th className="px-3 py-2 font-medium w-16">Status</th>
            <th className="px-3 py-2 font-medium w-24">Duration (ms)</th>
            <th className="px-3 py-2 font-medium w-60">Query</th>
            <th className="px-3 py-2 font-medium w-60">Body</th>
          </tr>
        </thead>
        <tbody>
          {rowsMemo.map((log) => {
            const time = new Date(
              log.requestAt as unknown as string
            ).toLocaleString();
            const id = log.id;
            const queryText = log.query ?? "";
            const bodyText = log.body ?? "";
            const canToggleQuery = queryText.length > PREVIEW_MAX;
            const canToggleBody = bodyText.length > PREVIEW_MAX;
            const isQueryExpanded = !!expandedQuery[id];
            const isBodyExpanded = !!expandedBody[id];

            const queryDisplay = isQueryExpanded
              ? queryText
              : canToggleQuery
              ? truncate(queryText, PREVIEW_MAX)
              : queryText;

            const bodyDisplay = isBodyExpanded
              ? bodyText
              : canToggleBody
              ? truncate(bodyText, PREVIEW_MAX)
              : bodyText;

            return (
              <tr
                key={id}
                className="border-b last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-3 py-2 whitespace-nowrap align-top">
                  {time}
                </td>
                <td className="px-3 py-2 whitespace-nowrap align-top">
                  {log.method}
                </td>
                <td className="px-3 py-2 align-top">
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {log.route}
                  </code>
                </td>
                <td className="px-3 py-2 whitespace-nowrap align-top">
                  {log.statusCode}
                </td>
                <td className="px-3 py-2 whitespace-nowrap align-top">
                  {log.duration.toFixed(2)}
                </td>

                {/* Query cell */}
                <td className="px-3 py-2 align-top">
                  <div>
                    <pre
                      className={`whitespace-pre-wrap break-all text-xs rounded p-1 ${
                        canToggleQuery
                          ? isQueryExpanded
                            ? "" // expanded: no internal scrollbar — content grows naturally
                            : "max-h-20 overflow-hidden" // collapsed: hide overflow (no scrollbar)
                          : ""
                      }`}
                    >
                      {queryDisplay}
                    </pre>
                    {canToggleQuery ? (
                      <button
                        type="button"
                        aria-expanded={isQueryExpanded}
                        onClick={() => toggleQuery(id)}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        {isQueryExpanded ? "Collapse" : "Expand"}
                      </button>
                    ) : null}
                  </div>
                </td>

                {/* Body cell */}
                <td className="px-3 py-2 align-top">
                  <div>
                    <pre
                      className={`whitespace-pre-wrap break-all text-xs rounded p-1 ${
                        canToggleBody
                          ? isBodyExpanded
                            ? "" // expanded: no internal scrollbar
                            : "max-h-20 overflow-hidden" // collapsed: hide overflow
                          : ""
                      }`}
                    >
                      {bodyDisplay}
                    </pre>
                    {canToggleBody ? (
                      <button
                        type="button"
                        aria-expanded={isBodyExpanded}
                        onClick={() => toggleBody(id)}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        {isBodyExpanded ? "Collapse" : "Expand"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="p-3 flex items-center justify-between border-t">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage} of {totalPages} ({total} logs)
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => goto(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="rounded px-2 py-1 text-sm border disabled:opacity-50"
            aria-label="Previous page"
          >
            Prev
          </button>

          {makePageRange(currentPage, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`dot-${i}`} className="px-2 text-sm">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goto(p as number)}
                disabled={p === currentPage || loading}
                className={`min-w-[32px] rounded px-2 py-1 text-sm border ${
                  p === currentPage ? "bg-primary text-white" : ""
                } disabled:opacity-50`}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => goto(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="rounded px-2 py-1 text-sm border disabled:opacity-50"
            aria-label="Next page"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}
