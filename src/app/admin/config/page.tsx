"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Panel, SystemChip, Tag } from "@/components/ui/Bits";
import { describeTrigger } from "@/lib/runbook";
import { ago } from "@/lib/format";

function SectionHead({
  title,
  count,
  blurb,
  action,
}: {
  title: string;
  count: number;
  blurb: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy flex items-center gap-2">
          {title}
          <span className="text-ink/60 font-semibold normal-case tracking-normal">{count}</span>
        </h2>
        <p className="text-[12.5px] text-ink mt-0.5 max-w-3xl">{blurb}</p>
      </div>
      {action}
    </div>
  );
}

function Card({
  href,
  title,
  children,
  muted,
}: {
  href: string;
  title: React.ReactNode;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block bg-white border border-line rounded-[10px] p-3 hover:border-navy-600 transition-colors ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="text-[13.5px] font-bold text-navy mono">{title}</div>
      {children}
    </Link>
  );
}

export default function ConfigurationPage() {
  const { automations, runbooks, snippets, agents, nowMs } = useStore();
  const [infraOpen, setInfraOpen] = useState(false);

  const nameOf = (slug: string) => agents.find((a) => a.slug === slug)?.name ?? slug;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[19px] font-bold text-navy">Configuration</h3>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          An <strong className="text-ink-strong">automation</strong> pairs an{" "}
          <strong className="text-ink-strong">agent</strong> with a{" "}
          <strong className="text-ink-strong">runbook</strong> and decides when it runs. The agent
          is the service identity the work happens as. The runbook is the instructions it follows.
          That is the whole model.
        </p>
      </div>

      <div>
        <SectionHead
          title="Automations"
          count={automations.length}
          blurb="Each one answers three questions: which agent, which runbook, and what starts a run."
          action={
            <Link href="/admin/config/automations/new">
              <Button variant="primary">New automation</Button>
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {automations.map((a) => {
            const rb = runbooks.find((r) => r.id === a.runbookId);
            return (
              <Card
                key={a.id}
                href={`/admin/config/automations/${a.id}`}
                muted={!a.enabled}
                title={
                  <span className="flex items-center gap-2">
                    {a.name}
                    {!a.enabled && <Tag tone="neutral">Paused</Tag>}
                  </span>
                }
              >
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Tag tone="navy">{nameOf(a.agentSlug)}</Tag>
                  <span aria-hidden className="text-ink/40 text-[11px]">
                    +
                  </span>
                  <Tag tone="sage">{rb?.name ?? a.runbookId}</Tag>
                </div>
                <p className="text-[12px] text-ink mt-2">{describeTrigger(a.trigger)}</p>
                <div className="text-[11.5px] text-ink/70 mt-2 flex gap-3">
                  <span>concurrency {a.concurrency}</span>
                  <span>{a.runsLast24h} runs in 24h</span>
                  {a.lastPollAt && <span>polled {ago(a.lastPollAt, nowMs)}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHead
          title="Agents"
          count={agents.length}
          blurb="The service identities work is attributed to. Comments, edits and receipts appear under these names, never under a person's."
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {agents.map((a) => (
            <Card key={a.slug} href={`/agents/${a.slug}`} title={a.slug}>
              <div className="text-[12.5px] text-ink-strong mt-1">{a.name}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {a.systems.map((s) => (
                  <SystemChip key={s} system={s} />
                ))}
              </div>
              <div className="text-[11.5px] text-ink/70 mt-2">
                {a.tools.length} tools granted · owned by {a.owner}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHead
          title="Runbooks"
          count={runbooks.length}
          blurb="The instructions an agent follows, and what counts as done. Editing one changes behaviour on the next run."
          action={
            <Link href="/admin/runbooks">
              <Button variant="secondary">Open editor</Button>
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {runbooks.map((rb) => {
            const used = automations.filter((a) => a.runbookId === rb.id).length;
            return (
              <Card key={rb.id} href={`/admin/runbooks/${rb.id}`} title={rb.name}>
                <p className="text-[12px] text-ink mt-1.5 line-clamp-3">{rb.summary}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {used === 0 ? (
                    <Tag tone="gold">Not used</Tag>
                  ) : (
                    <Tag tone="neutral">
                      {used} automation{used === 1 ? "" : "s"}
                    </Tag>
                  )}
                  <Tag tone="neutral">includes {rb.includes.length}</Tag>
                  <span className="text-[11.5px] text-ink/70">
                    v{rb.versions[0]?.version ?? 1} · {ago(rb.updatedAt, nowMs)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Panel flush>
        <button
          onClick={() => setInfraOpen((o) => !o)}
          aria-expanded={infraOpen}
          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f7f9fb]"
        >
          <span
            aria-hidden
            className={`text-ink/50 text-[10px] transition-transform ${infraOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy">
            Infrastructure
          </span>
          <span className="text-[12.5px] text-ink ml-auto">
            Connected accounts, runtime defaults, shared snippets
          </span>
        </button>
        {infraOpen && (
          <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-3.5 border-t border-line">
            {[
              { k: "Runtime", v: "Ephemeral Fargate task per run, per-task IAM, destroyed on exit" },
              { k: "Gateway", v: "mintmcp / esq-prod, deterministic policy table" },
              { k: "Identity", v: "Okta for employees, workload identity per agent" },
              { k: "Model serving", v: "Bedrock, us-east-1" },
              { k: "Evidence", v: "s3://esq-ai-evidence, retained 7 years" },
              { k: "Telemetry", v: "Sumo Logic, redacted before egress" },
              {
                k: "Shared snippets",
                v: `${snippets.length} defined, ${snippets.filter((s) => s.onDemand).length} read on demand`,
              },
              { k: "Package source", v: "GitLab, signed, canary then rollback" },
            ].map((row) => (
              <div key={row.k}>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  {row.k}
                </dt>
                <dd className="text-[12.5px] text-ink-strong mt-0.5">{row.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </div>
  );
}
