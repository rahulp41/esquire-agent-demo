"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Confidence, Empty, Panel, Tag } from "@/components/ui/Bits";
import { ago, stamp } from "@/lib/format";

/**
 * What already happened, for the person it happened to.
 *
 * This is the ledger with the plumbing taken off: no correlation ids, no
 * payload hashes, no evidence keys, no actor strings like `agent:foo`. The full
 * ledger still exists under Admin, unchanged, for anyone who needs to audit.
 */
export default function History() {
  const { myIntents, myRuns, nowMs, isAdmin } = useStore();
  const [q, setQ] = useState("");

  const decided = myIntents
    .filter((i) => i.state !== "pending")
    .filter((i) =>
      q ? `${i.effect} ${i.target.label} ${i.agentName}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    .sort((a, b) => ((a.decidedAt ?? "") < (b.decidedAt ?? "") ? 1 : -1));

  const finished = myRuns
    .filter((r) => r.state === "complete" || r.state === "failed" || r.state === "escalated")
    .filter((r) => (q ? `${r.title} ${r.agentName}`.toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-navy leading-tight">History</h1>
          <p className="text-[13.5px] text-ink mt-1 max-w-2xl">
            {isAdmin
              ? "Every decision and every finished run across the platform. Kept permanently, so a question about what happened months from now has an answer."
              : "Decisions you made, and work that was raised for you or your team. Other people's work is not listed here. Everything is kept permanently, so a question about what happened months from now has an answer."}
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search history"
          aria-label="Search history"
          className="border border-line rounded-[8px] px-3 py-2 text-[13px] w-60 bg-white"
        />
      </div>

      <Panel flush>
        {decided.length === 0 ? (
          <Empty>You have not decided anything yet.</Empty>
        ) : (
          <table className="data-grid">
            <thead>
              <tr>
                <th className="w-[460px]">What was proposed</th>
                <th>Document</th>
                <th>Evidence</th>
                <th>Outcome</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((i) => (
                <tr key={i.id}>
                  <td className="max-w-[460px]">
                    <Link
                      href={`/approvals/${i.id}`}
                      className="text-[13px] font-semibold text-ink-strong hover:underline"
                    >
                      {i.effect}
                    </Link>
                    <div className="text-[12px] text-ink mt-0.5">by {i.agentName}</div>
                  </td>
                  <td className="text-[12.5px] max-w-[220px]">{i.target.label}</td>
                  <td>
                    <Confidence value={i.confidence} basis={i.confidenceBasis} size="compact" />
                  </td>
                  <td className="whitespace-nowrap">
                    {i.state === "rejected" ? (
                      <Tag tone="danger">Rejected</Tag>
                    ) : (
                      <Tag tone="green">Approved and done</Tag>
                    )}
                    {i.decidedBy && (
                      <div className="text-[11.5px] text-ink mt-1">by {i.decidedBy}</div>
                    )}
                  </td>
                  <td className="text-[12px] whitespace-nowrap">
                    {i.decidedAt ? ago(i.decidedAt, nowMs) : ""}
                    <div className="text-ink/60">{i.decidedAt ? stamp(i.decidedAt) : ""}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel flush>
        {finished.length === 0 ? (
          <Empty>Nothing has finished yet.</Empty>
        ) : (
          <table className="data-grid">
            <thead>
              <tr>
                <th className="w-[460px]">Completed tasks</th>
                <th>Agent</th>
                <th>Result</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((r) => (
                <tr key={r.id}>
                  <td className="text-[13px] font-semibold text-ink-strong max-w-[460px]">
                    {r.title}
                  </td>
                  <td className="text-[12.5px]">{r.agentName}</td>
                  <td className="whitespace-nowrap">
                    {r.state === "complete" ? (
                      <Tag tone="green">Finished</Tag>
                    ) : r.state === "escalated" ? (
                      <Tag tone="gold">Handed to a person</Tag>
                    ) : (
                      <Tag tone="danger">Stopped</Tag>
                    )}
                  </td>
                  <td className="text-[12px] whitespace-nowrap">
                    {ago(r.startedAt, nowMs)}
                    <div className="text-ink/60">{stamp(r.startedAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {isAdmin && (
        <p className="text-[12px] text-ink">
          The complete ledger, with correlation ids, payload hashes and evidence keys, is under{" "}
          <Link href="/admin/activity" className="text-navy font-semibold underline">
            Admin → Activity
          </Link>
          .
        </p>
      )}
    </div>
  );
}
