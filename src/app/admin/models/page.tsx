"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Panel, Tag } from "@/components/ui/Bits";
import type { ModelEntry, WriteTier } from "@/lib/types";

const TIER_TONE: Record<WriteTier, "green" | "sage" | "gold" | "danger"> = {
  "read-only": "green",
  low: "sage",
  medium: "gold",
  high: "danger",
};

const STATUS_TONE: Record<ModelEntry["status"], "green" | "gold" | "neutral"> = {
  approved: "green",
  evaluating: "gold",
  retired: "neutral",
};

export default function ModelsPage() {
  const { models, runbooks, automations } = useStore();

  const usage = (modelId: string) => {
    const books = runbooks.filter(
      (r) => (r.defaults.model === modelId) || false,
    );
    const overridden = automations.filter((a) => a.overrides.model === modelId);
    return { books, overridden };
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[19px] font-bold text-navy">Models</h3>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          Which models agents may run on, and how far each one is cleared to go. A model is
          approved up to a write tier, not approved in general. Raising that ceiling is a
          governance decision with an eval behind it, not a dropdown someone changes on a Friday.
        </p>
      </div>

      <Panel flush title="Approved models">
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Model</th>
                <th>Served via</th>
                <th>Cleared up to</th>
                <th>Context</th>
                <th className="text-right">In / out per 1M</th>
                <th>Status</th>
                <th>Used by</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const u = usage(m.id);
                return (
                  <tr key={m.id} className={m.status === "retired" ? "opacity-55" : undefined}>
                    <td className="max-w-[300px]">
                      <div className="mono font-semibold text-navy">{m.id}</div>
                      <div className="text-[12px] text-ink-strong">{m.label}</div>
                      <p className="text-[11.5px] text-ink mt-0.5">{m.note}</p>
                    </td>
                    <td className="text-[12.5px] whitespace-nowrap">{m.servedVia}</td>
                    <td>
                      <Tag tone={TIER_TONE[m.approvedUpTo]}>
                        {m.approvedUpTo === "read-only" ? "Read only" : `${m.approvedUpTo} writes`}
                      </Tag>
                    </td>
                    <td className="text-[12.5px] tabular">{m.contextWindow}</td>
                    <td className="text-right tabular text-[12.5px] whitespace-nowrap">
                      ${m.inputPer1M} / ${m.outputPer1M}
                    </td>
                    <td>
                      <Tag tone={STATUS_TONE[m.status]}>
                        {m.status[0].toUpperCase() + m.status.slice(1)}
                      </Tag>
                    </td>
                    <td className="text-[12px]">
                      {u.books.length === 0 && u.overridden.length === 0 ? (
                        <span className="text-ink/40">not in use</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {u.books.map((b) => (
                            <Link
                              key={b.id}
                              href={`/admin/runbooks/${b.id}`}
                              className="mono text-navy hover:underline"
                            >
                              {b.name}
                            </Link>
                          ))}
                          {u.overridden.map((a) => (
                            <Link
                              key={a.id}
                              href={`/admin/config/automations/${a.id}`}
                              className="mono text-gold-600 hover:underline"
                            >
                              {a.name} (override)
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Panel title="How a model gets cleared">
          <ol className="space-y-2">
            {[
              "The eval suite for every runbook that would use it runs green, at or above the runbook's own gate.",
              "An injection and tool-abuse suite runs against it at the intended write tier.",
              "It ships to one automation on canary, with rollback armed on the production threshold.",
              "Two weeks of canary with no threshold breach, then the ceiling is raised.",
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-ink-strong">
                <span className="w-5 h-5 rounded-full bg-navy text-white grid place-items-center text-[10.5px] font-bold shrink-0">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-ink mt-3">
            A model in evaluation is pinned to read-only regardless of what a runbook asks for. The
            ceiling is enforced at the gateway, not by the dropdown.
          </p>
        </Panel>

        <Panel title="Why the ceiling is per-tier">
          <p className="text-[13px] text-ink-strong">
            A cheaper model that triages tickets well is not therefore trustworthy issuing a credit
            memo. The two tasks fail differently: a mis-triaged ticket costs someone an hour, a
            wrong credit memo moves money and has to be unwound with a client.
          </p>
          <p className="text-[13px] text-ink mt-2">
            Tying approval to the write tier rather than to the model keeps that distinction in the
            configuration instead of in someone&apos;s head. It also means a model swap is a
            bounded change: it can only ever move work to a model already cleared for that tier.
          </p>
          <p className="text-[12px] text-ink mt-2">
            Every change here lands on the{" "}
            <Link href="/admin/activity" className="text-navy font-semibold underline">
              activity ledger
            </Link>{" "}
            as a configuration change, with the person who made it.
          </p>
        </Panel>
      </div>
    </div>
  );
}
