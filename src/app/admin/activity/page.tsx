"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Empty, Panel, Tag } from "@/components/ui/Bits";
import type { LedgerKind } from "@/lib/types";
import { stamp } from "@/lib/format";

const KIND_TONE: Record<LedgerKind, "neutral" | "navy" | "green" | "gold" | "danger" | "sage"> = {
  intent: "gold",
  approval: "sage",
  rejection: "danger",
  attempt: "navy",
  receipt: "green",
  "policy-block": "danger",
  escalation: "danger",
  "config-change": "navy",
};

const KIND_LABEL: Record<LedgerKind, string> = {
  intent: "Intent raised",
  approval: "Approved",
  rejection: "Rejected",
  attempt: "Write attempted",
  receipt: "Receipt verified",
  "policy-block": "Blocked by policy",
  escalation: "Escalated",
  "config-change": "Configuration changed",
};

export default function ActivityPage() {
  const { ledger, fresh } = useStore();
  const [kind, setKind] = useState<LedgerKind | "all">("all");
  const [q, setQ] = useState("");

  const rows = ledger.filter((l) => {
    if (kind !== "all" && l.kind !== kind) return false;
    if (!q) return true;
    return `${l.summary} ${l.actor} ${l.runId} ${l.correlationId} ${l.payloadHash ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  function exportCsv() {
    const header = "id,at,kind,run,correlation,actor,system,summary,payload_hash,evidence\n";
    const body = rows
      .map((l) =>
        [
          l.id,
          l.at,
          l.kind,
          l.runId,
          l.correlationId,
          l.actor,
          l.system ?? "",
          `"${l.summary.replace(/"/g, '""')}"`,
          l.payloadHash ?? "",
          l.evidenceKey ?? "",
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "esquire-agent-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-navy leading-tight">Activity</h1>
          <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
            The business ledger, append-only. Every proposed action, every human decision, every
            write attempt and every verified receipt, correlated across the asynchronous
            boundaries so one identifier follows a piece of work end to end.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          Export {rows.length} rows as CSV
        </Button>
      </div>

      <Panel
        flush
        title="Ledger"
        right={
          <div className="flex items-center gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as LedgerKind | "all")}
              aria-label="Filter by entry type"
              className="border border-line rounded-[8px] px-2 py-1.5 text-[12.5px] bg-white"
            >
              <option value="all">All entry types</option>
              {(Object.keys(KIND_LABEL) as LedgerKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by actor, run, hash"
              aria-label="Filter ledger"
              className="border border-line rounded-[8px] px-2.5 py-1.5 text-[13px] w-60 bg-white"
            />
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty>No ledger entry matches that filter.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Entry</th>
                  <th>What happened</th>
                  <th>Actor</th>
                  <th>Run</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className={fresh.includes(l.id) ? "bg-sage/8" : undefined}>
                    <td className="mono text-ink/70 whitespace-nowrap">{stamp(l.at)}</td>
                    <td>
                      <Tag tone={KIND_TONE[l.kind]}>{KIND_LABEL[l.kind]}</Tag>
                      {fresh.includes(l.id) && (
                        <div className="text-[11px] text-brandgreen font-semibold mt-1">
                          new this session
                        </div>
                      )}
                    </td>
                    <td className="text-[12.5px] max-w-[460px]">
                      {l.summary}
                      {l.payloadHash && (
                        <div className="mono text-ink/60 mt-0.5">{l.payloadHash}</div>
                      )}
                    </td>
                    <td className="mono text-ink/80">{l.actor}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/runs/${l.runId}`} className="mono text-navy hover:underline">
                        {l.runId}
                      </Link>
                      <div className="mono text-ink/50">{l.correlationId}</div>
                    </td>
                    <td className="mono text-ink/60 max-w-[240px] break-all">
                      {l.evidenceKey ?? <span className="text-ink/35">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-[12px] text-ink max-w-3xl">
        Rows are never edited or deleted. A correction is a new entry. Prompts and model outputs
        are excluded by default and redaction runs before anything reaches the observability
        platform, so this view is safe to hand to an auditor.
      </p>
    </div>
  );
}
