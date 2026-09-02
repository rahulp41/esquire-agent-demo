"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Collapsible } from "@/components/admin/Collapsible";
import { Button, Empty, Tag } from "@/components/ui/Bits";
import { describeTrigger } from "@/lib/runbook";
import { ago, duration, stamp, usd } from "@/lib/format";
import type { EnsembleOutcome } from "@/lib/types";

const OUTCOME: Record<EnsembleOutcome, { label: string; tone: "green" | "gold" | "danger" | "neutral" | "sage" }> = {
  diagnosis: { label: "Diagnosis", tone: "green" },
  "change-proposed": { label: "Change proposed", tone: "sage" },
  "asked-a-question": { label: "Asked a question", tone: "gold" },
  "no-action": { label: "No action needed", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
};

export default function ControlRoom() {
  const { automations, runbooks, ensembleRuns, questions, agents, nowMs, toggleAutomation } =
    useStore();

  const nameOf = (slug: string) => agents.find((a) => a.slug === slug)?.name ?? slug;

  const running = ensembleRuns.filter((r) => r.state === "running");
  const waiting = questions.filter((q) => q.state === "waiting");
  const recent = ensembleRuns.filter((r) => r.state === "done" || r.state === "failed");
  const done = recent.filter((r) => r.outcome !== "failed").length;
  const other = recent.length - done;
  const enabled = automations.filter((a) => a.enabled).length;

  const concurrencyInUse = running.length;
  const concurrencyCap = automations.filter((a) => a.enabled).reduce((n, a) => n + a.concurrency, 0);
  const spend = ensembleRuns.reduce((n, r) => n + r.costUsd, 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[19px] font-bold text-navy">Control room</h3>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          What the platform is doing right now: automations configured to run, work in flight, and
          anything waiting on a person.
        </p>
      </div>

      {/* Health strip. Everything here is a fact about the platform, not a metric. */}
      <div className="bg-white border border-line rounded-[10px] px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12.5px]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-2 h-2 rounded-full bg-brandgreen" />
          <strong className="text-ink-strong">Poller healthy</strong>
        </span>
        <span>
          Last sweep <span className="tabular">{ago("2026-08-28T14:11:30-04:00", nowMs)}</span>
        </span>
        <span>
          Concurrency <span className="tabular font-semibold text-ink-strong">{concurrencyInUse}</span>{" "}
          of {concurrencyCap}
        </span>
        <span>
          Spend, last 24h <span className="tabular font-semibold text-ink-strong">{usd(spend)}</span>
        </span>
        <span className="text-ink">
          Connected: NetSuite · Salesforce · Microsoft 365 · Box · Atlassian · Zoom
        </span>
        <Link href="/admin/activity" className="ml-auto text-navy font-semibold hover:underline">
          Full ledger
        </Link>
      </div>

      <Collapsible
        title="Automations"
        summary="What is configured to run, and what starts it."
        badges={
          <Tag tone="neutral">
            {enabled} of {automations.length} enabled
          </Tag>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="w-[202px]">Automation</th>
                <th>Starts when</th>
                <th>Runbook</th>
                <th>Agent</th>
                <th className="text-right">Concurrency</th>
                <th>Last poll</th>
                <th className="text-right">24h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => {
                const rb = runbooks.find((r) => r.id === a.runbookId);
                const muted = a.enabled ? "" : "opacity-55";
                return (
                  <tr key={a.id}>
                    <td className={muted}>
                      <Link
                        href={`/admin/config/automations/${a.id}`}
                        className="font-semibold text-navy hover:underline mono leading-[1.1]"
                      >
                        {a.name}
                      </Link>
                      <div className="text-[11.5px] text-ink">{a.owner}</div>
                    </td>
                    <td className={`max-w-[360px] text-[12.5px] ${muted}`}>
                      {describeTrigger(a.trigger)}
                    </td>
                    <td className={muted}>
                      <Link
                        href={`/admin/runbooks/${a.runbookId}`}
                        className="mono text-navy hover:underline"
                      >
                        {rb?.name ?? a.runbookId}
                      </Link>
                    </td>
                    <td className={`text-[12.5px] ${muted}`}>{nameOf(a.agentSlug)}</td>
                    <td className={`text-right tabular ${muted}`}>{a.concurrency}</td>
                    <td className={`text-[12px] whitespace-nowrap ${muted}`}>
                      {a.lastPollAt ? ago(a.lastPollAt, nowMs) : <span className="text-ink/40">never</span>}
                    </td>
                    <td className={`text-right tabular ${muted}`}>{a.runsLast24h}</td>
                    <td className="text-right whitespace-nowrap">
                      <Button
                        variant={a.enabled ? "secondary" : "primary"}
                        onClick={() => toggleAutomation(a.id)}
                        className="w-[88px]"
                      >
                        {a.enabled ? "Pause" : "Resume"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <Collapsible
        title="Running now"
        tone={running.length ? "active" : "neutral"}
        summary={
          running.length
            ? "Work in flight. Each run holds one throwaway sandbox, destroyed on exit."
            : "Nothing in flight."
        }
        badges={<Tag tone={running.length ? "navy" : "neutral"}>{running.length} running</Tag>}
      >
        {running.length === 0 ? (
          <Empty>No run is active. Scheduled automations will start on their next tick.</Empty>
        ) : (
          <table className="data-grid">
            <thead>
              <tr>
                <th>Work item</th>
                <th>Automation</th>
                <th>Agent</th>
                <th className="text-right">Turns</th>
                <th>Age</th>
                <th>Sandbox</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {running.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a
                      href={r.workItemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono font-semibold text-navy hover:underline"
                    >
                      {r.workItem}
                    </a>
                    <div className="text-[12px] text-ink">{r.title}</div>
                  </td>
                  <td className="mono text-[12px]">{r.automationId.replace("auto-", "")}</td>
                  <td className="text-[12.5px]">{nameOf(r.agentSlug)}</td>
                  <td className="text-right tabular">{r.turns}</td>
                  <td className="text-[12.5px] whitespace-nowrap">{ago(r.startedAt, nowMs)}</td>
                  <td className="mono text-ink/60">{r.sandbox}</td>
                  <td className="text-right">
                    <Button variant="danger" className="w-[88px]">Stop</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Collapsible>

      <Collapsible
        title="Waiting on a human"
        tone={waiting.length ? "attention" : "neutral"}
        summary={
          waiting.length
            ? "An agent could not decide, said so on the work item, named a person, and stopped."
            : "Nothing is blocked on an answer."
        }
        badges={<Tag tone={waiting.length ? "gold" : "neutral"}>{waiting.length} waiting</Tag>}
      >
        {waiting.length === 0 ? (
          <Empty>
            Nothing is waiting. When an agent hits a decision it cannot make, it asks on the work
            item and the run ends here rather than guessing.
          </Empty>
        ) : (
          <table className="data-grid">
            <thead>
              <tr>
                <th>Work item</th>
                <th>What it could not decide</th>
                <th>Asked</th>
                <th>Waiting</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {waiting.map((q) => (
                <tr key={q.id}>
                  <td className="whitespace-nowrap">
                    <a
                      href={q.workItemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono font-semibold text-navy hover:underline"
                    >
                      {q.workItem}
                    </a>
                    <div className="text-[11.5px] text-ink">{nameOf(q.agentSlug)}</div>
                  </td>
                  <td className="text-[12.5px] max-w-[520px]">{q.question}</td>
                  <td className="text-[12.5px] whitespace-nowrap">
                    @{q.mentioned}
                    <div className="text-ink/60">{stamp(q.askedAt)}</div>
                  </td>
                  <td className="text-[12.5px] tabular whitespace-nowrap text-gold-600 font-semibold">
                    {ago(q.askedAt, nowMs)}
                  </td>
                  <td className="text-right">
                    <a href={q.workItemUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="w-[88px]">Answer</Button>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Collapsible>

      <Collapsible
        title="Last 24 hours"
        summary="Everything that finished, and how it finished."
        badges={
          <span className="flex gap-1.5">
            <Tag tone="green">{done} completed</Tag>
            <Tag tone="neutral">{other} other</Tag>
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Work item</th>
                <th>Automation</th>
                <th>Outcome</th>
                <th className="text-right">Turns</th>
                <th className="text-right">Duration</th>
                <th className="text-right">Cost</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const o = r.outcome ? OUTCOME[r.outcome] : undefined;
                return (
                  <tr key={r.id}>
                    <td>
                      <a
                        href={r.workItemUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono font-semibold text-navy hover:underline"
                      >
                        {r.workItem}
                      </a>
                      <div className="text-[12px] text-ink">{r.title}</div>
                      {r.note && <div className="text-[11.5px] text-ink/70 mt-0.5">{r.note}</div>}
                    </td>
                    <td className="mono text-[12px]">{r.automationId.replace("auto-", "")}</td>
                    <td>{o && <Tag tone={o.tone}>{o.label}</Tag>}</td>
                    <td className="text-right tabular">{r.turns}</td>
                    <td className="text-right tabular">{duration(r.durationMs)}</td>
                    <td className="text-right tabular">{usd(r.costUsd)}</td>
                    <td className="text-[12px] whitespace-nowrap">{ago(r.startedAt, nowMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}
