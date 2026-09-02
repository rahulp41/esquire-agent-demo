"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Tag } from "@/components/ui/Bits";
import { ago } from "@/lib/format";

function Section({
  title,
  count,
  blurb,
  children,
}: {
  title: string;
  count: number;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy flex items-center gap-2">
          {title}
          <span className="text-ink/60 font-semibold normal-case tracking-normal">{count}</span>
        </h2>
        <p className="text-[12.5px] text-ink mt-0.5 max-w-3xl">{blurb}</p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

export default function RunbooksLibrary() {
  const { runbooks, snippets, automations, nowMs } = useStore();

  const shared = snippets.filter((s) => !s.onDemand);
  const reference = snippets.filter((s) => s.onDemand);

  const usedBy = (id: string) => runbooks.filter((r) => r.includes.includes(id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[19px] font-bold text-navy">Runbooks</h3>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          A runbook is the instructions an agent follows, and what counts as done. This is where
          the leverage is: changing how an agent triages a NetSuite ticket is editing a paragraph,
          not shipping code, and the change is live on the next run.
        </p>
      </div>

      <Section
        title="Runbooks"
        count={runbooks.length}
        blurb="Pick one of these when you add an automation. It is loaded as the agent's instructions on every run."
      >
        {runbooks.map((rb) => {
          const used = automations.filter((a) => a.runbookId === rb.id).length;
          return (
            <Link
              key={rb.id}
              href={`/admin/runbooks/${rb.id}`}
              className="block bg-white border border-line rounded-[10px] p-3 hover:border-navy-600 transition-colors"
            >
              <div className="text-[13.5px] font-bold text-navy mono">{rb.name}</div>
              <p className="text-[12px] text-ink mt-1.5">{rb.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {used === 0 ? (
                  <Tag tone="gold">Not used</Tag>
                ) : (
                  <Tag tone="sage">
                    {used} automation{used === 1 ? "" : "s"}
                  </Tag>
                )}
                <Tag tone="neutral">includes {rb.includes.length}</Tag>
                <Tag tone="neutral">v{rb.versions[0]?.version ?? 1}</Tag>
                <span className="text-[11.5px] text-ink/70">{ago(rb.updatedAt, nowMs)}</span>
              </div>
              <div className="text-[11.5px] text-ink/70 mt-1.5">Owned by {rb.owner}</div>
            </Link>
          );
        })}
      </Section>

      <Section
        title="Shared snippets"
        count={shared.length}
        blurb="Reusable sections pulled into runbooks at compose time. Edit once and every runbook that includes it changes."
      >
        {shared.map((s) => (
          <div key={s.id} className="bg-white border border-line rounded-[10px] p-3">
            <div className="text-[13px] font-bold text-navy mono">{s.name}</div>
            <p className="text-[12px] text-ink mt-1.5">{s.summary}</p>
            <div className="mt-2.5">
              {usedBy(s.id) === 0 ? (
                <Tag tone="gold">Not included anywhere</Tag>
              ) : (
                <Tag tone="neutral">
                  used by {usedBy(s.id)} runbook{usedBy(s.id) === 1 ? "" : "s"}
                </Tag>
              )}
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Reference docs"
        count={reference.length}
        blurb="Standalone material an agent reads on demand rather than on every run. Status tables, routing matrices, and the like."
      >
        {reference.map((s) => (
          <div key={s.id} className="bg-white border border-line rounded-[10px] p-3">
            <div className="text-[13px] font-bold text-navy mono">{s.name}</div>
            <p className="text-[12px] text-ink mt-1.5">{s.summary}</p>
            <div className="mt-2.5 flex gap-1.5">
              <Tag tone="sage">Read on demand</Tag>
              <Tag tone="neutral">
                offered by {usedBy(s.id)} runbook{usedBy(s.id) === 1 ? "" : "s"}
              </Tag>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}
