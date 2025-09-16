"use client";

import { useMemo } from "react";
import { Log } from "@/utils/db/schema";

type LogsViewerProps = {
  logs: Log[];
};

function truncate(value: string | null | undefined, max = 120) {
  if (!value) return "";
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

export default function LogsViewer({ logs }: LogsViewerProps) {
  const rows = useMemo(() => {
    return logs ?? [];
  }, [logs]);

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        No logs found for this environment yet.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr className="border-b">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Route</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Duration (ms)</th>
            <th className="px-3 py-2 font-medium">Query</th>
            <th className="px-3 py-2 font-medium">Body</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => {
            const time = new Date(
              log.requestAt as unknown as string
            ).toLocaleString();
            return (
              <tr
                key={log.id}
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
                  {log.duration}
                </td>
                <td className="px-3 py-2 align-top max-w-[24rem]">
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {truncate(log.query ?? "", 200)}
                  </pre>
                </td>
                <td className="px-3 py-2 align-top max-w-[24rem]">
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {truncate(log.body ?? "", 200)}
                  </pre>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
