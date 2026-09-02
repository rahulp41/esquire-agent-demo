"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Empty, Panel, RunStateTag, Tag } from "@/components/ui/Bits";
import { ago, stamp, usd } from "@/lib/format";

export default function RunsPage() {
  const { runs, nowMs } = useStore();
  const [q, setQ] = useState("");

  const rows = runs
    .filter((r) =>
      q
        ? `${r.title} ${r.agentName} ${r.id} ${r.correlationId}`
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    )
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold text-navy leading-tight">Runs</h1>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          One row per agent execution, whether a person launched it, a schedule fired it, or an
          upstream system raised an event. The state comes from the durable orchestrator, so a
          run that is paused waiting on an approval says so rather than looking stalled.
        </p>
      </div>

      <Panel
        flush
        title="Execution history"
        right={
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title, agent or correlation id"
            aria-label="Filter runs"
            className="border border-line rounded-[8px] px-2.5 py-1.5 text-[13px] w-72 bg-white"
          />
        }
      >
        {rows.length === 0 ? (
          <Empty>No run matches that filter.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Agent</th>
                  <th>State</th>
                  <th>Started</th>
                  <th>Trigger</th>
                  <th className="text-right">Tool calls</th>
                  <th className="text-right">Cost</th>
                  <th>Correlation</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[340px]">
                      <Link
                        href={`/admin/runs/${r.id}`}
                        className="font-semibold text-navy hover:underline text-[13.5px]"
                      >
                        {r.title}
                      </Link>
                      <div className="mono text-ink/60">{r.id}</div>
                    </td>
                    <td className="text-[12.5px]">{r.agentName}</td>
                    <td>
                      <RunStateTag state={r.state} />
                      {r.intentIds.length > 0 && (
                        <div className="text-[11.5px] text-ink mt-1">
                          {r.intentIds.length} action intent
                          {r.intentIds.length === 1 ? "" : "s"}
                        </div>
                      )}
                    </td>
                    <td className="text-[12.5px] whitespace-nowrap">
                      {ago(r.startedAt, nowMs)}
                      <div className="text-ink/60">{stamp(r.startedAt)}</div>
                    </td>
                    <td className="text-[12.5px]">
                      <Tag tone="neutral">{r.trigger}</Tag>
                      <div className="text-ink mt-1">{r.startedBy}</div>
                    </td>
                    <td className="text-right tabular">{r.toolCalls.length}</td>
                    <td className="text-right tabular">{usd(r.costUsd)}</td>
                    <td className="mono text-ink/60">{r.correlationId}</td>
                    <td className="text-right">
                      <Link href={`/admin/runs/${r.id}`}>
                        <Button variant="secondary">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
