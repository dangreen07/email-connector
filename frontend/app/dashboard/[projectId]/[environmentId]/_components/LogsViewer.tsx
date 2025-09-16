"use client";

import { useMemo, useState } from "react";
import { Log } from "@/utils/db/schema";

type LogsViewerProps = {
  logs: Log[];
};

const PREVIEW_MAX = 100;

function truncate(value: string | null | undefined, max = PREVIEW_MAX) {
  if (!value) return "";
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

export default function LogsViewer({ logs }: LogsViewerProps) {
  const rows = useMemo(() => logs ?? [], [logs]);

  const [expandedQuery, setExpandedQuery] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedBody, setExpandedBody] = useState<Record<string, boolean>>({});

  const toggleQuery = (id: string) =>
    setExpandedQuery((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleBody = (id: string) =>
    setExpandedBody((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!rows || rows.length === 0) {
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
          {rows.map((log) => {
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
                            ? "max-h-[36rem] overflow-auto"
                            : "max-h-20 overflow-hidden"
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
                            ? "max-h-[36rem] overflow-auto"
                            : "max-h-20 overflow-hidden"
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
    </div>
  );
}
