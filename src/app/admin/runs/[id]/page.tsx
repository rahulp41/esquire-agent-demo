"use client";

import Link from "next/link";
import { use } from "react";
import { useStore } from "@/lib/store";
import { Button, Empty, Field, Panel, RiskPill, RunStateTag } from "@/components/ui/Bits";
import { RunTimeline } from "@/components/RunTimeline";
import { ToolCallCard } from "@/components/ToolCallCard";
import { stamp, usd } from "@/lib/format";

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { runs, intents, ledger } = useStore();
  const run = runs.find((r) => r.id === id);

  if (!run) {
    return (
      <Panel>
        <Empty>
          No run with id {id}.{" "}
          <Link href="/admin/runs" className="text-navy font-semibold underline">
            Back to runs
          </Link>
          .
        </Empty>
      </Panel>
    );
  }

  const runIntents = intents.filter((i) => i.runId === run.id);
  const runLedger = ledger.filter((l) => l.runId === run.id);
  const blocked = run.toolCalls.filter((t) => t.verdict === "blocked");

  return (
    <div className="space-y-4">
      <nav className="text-[12.5px] text-ink">
        <Link href="/admin/runs" className="text-navy font-semibold hover:underline">
          Runs
        </Link>{" "}
        / <span className="mono">{run.id}</span>
      </nav>

      <Panel flush>
        <div className="px-4 py-3.5 flex flex-wrap items-start justify-between gap-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <RunStateTag state={run.state} />
              <span className="mono text-ink/60">{run.id}</span>
            </div>
            <h1 className="text-[19px] font-bold text-navy mt-1.5">{run.title}</h1>
            <p className="text-[12.5px] text-ink mt-0.5">
              <Link href={`/agents/${run.agentSlug}`} className="text-navy font-semibold hover:underline">
                {run.agentName}
              </Link>{" "}
              started {stamp(run.startedAt)} by {run.startedBy}
            </p>
          </div>
          {run.state === "awaiting-approval" && runIntents[0] && (
            <Link href={`/approvals/${runIntents[0].id}`}>
              <Button variant="primary">Review the pending action</Button>
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4 py-3.5">
          <Field label="Trigger">
            <span className="capitalize">{run.trigger}</span>
          </Field>
          <Field label="Correlation id">
            <span className="mono">{run.correlationId}</span>
          </Field>
          <Field label="Tool calls">{run.toolCalls.length}</Field>
          <Field label="Tokens">{run.tokens.toLocaleString()}</Field>
          <Field label="Model spend">{usd(run.costUsd)}</Field>
        </dl>
      </Panel>

      {blocked.length > 0 && (
        <div className="border border-danger/40 bg-danger/6 rounded-[10px] px-4 py-3">
          <div className="text-[12.5px] font-bold text-danger">
            The gateway refused {blocked.length} call on this run
          </div>
          <p className="text-[12.5px] text-ink-strong mt-1">
            A refusal is not a failure of the agent. It is the enforcement point doing its job:
            the call never reached the system of record, and nothing was partially written.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 items-start">
        <Panel title="Orchestrator timeline" subtitle="Step Functions Standard execution history.">
          <RunTimeline steps={run.steps} />
        </Panel>

        <div className="space-y-4">
          <Panel title="Governed tool calls" subtitle="Every call, with the verdict the gateway returned.">
            <div className="space-y-2">
              {run.toolCalls.map((t) => (
                <ToolCallCard key={t.id} call={t} />
              ))}
            </div>
          </Panel>

          {runIntents.length > 0 && (
            <Panel title="Action intents raised" flush>
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Intent</th>
                    <th>Effect</th>
                    <th>Risk</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {runIntents.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link
                          href={`/approvals/${i.id}`}
                          className="mono font-semibold text-navy hover:underline"
                        >
                          {i.id}
                        </Link>
                      </td>
                      <td className="text-[12.5px] max-w-[320px]">{i.effect}</td>
                      <td>
                        <RiskPill risk={i.risk} />
                      </td>
                      <td className="text-[12.5px] capitalize">
                        {i.state}
                        {i.decidedBy && (
                          <div className="text-ink">by {i.decidedBy}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          <Panel title="Ledger entries for this run" flush>
            <table className="data-grid">
              <tbody>
                {runLedger.map((l) => (
                  <tr key={l.id}>
                    <td className="mono text-ink/60 whitespace-nowrap">{stamp(l.at)}</td>
                    <td className="text-[12.5px]">
                      <span className="font-semibold capitalize text-ink-strong">{l.kind}</span>
                      <div>{l.summary}</div>
                      {l.evidenceKey && (
                        <div className="mono text-ink/60 mt-0.5">{l.evidenceKey}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}
