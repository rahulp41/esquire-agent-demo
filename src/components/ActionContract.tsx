"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Confidence, Detail, Field, Panel, RiskPill, Tag } from "@/components/ui/Bits";
import type { ActionIntent } from "@/lib/types";
import { remaining, stamp } from "@/lib/format";

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const { nowMs } = useStore();
  const r = remaining(expiresAt, nowMs);
  return (
    <span
      className={`tabular font-semibold ${
        r.expired || r.urgent ? "text-danger" : "text-ink-strong"
      }`}
      title={`Closes ${stamp(expiresAt)}`}
    >
      {r.expired ? "window closed" : r.label}
    </span>
  );
}

function DiffTable({ diff }: { diff: ActionIntent["diff"] }) {
  if (diff.length === 0) {
    return (
      <p className="text-[13px] text-ink p-4">
        Nothing existing is being changed. This creates something new, so there is no previous
        value to compare against.
      </p>
    );
  }
  return (
    <table className="data-grid">
      <thead>
        <tr>
          <th>Field</th>
          <th>Now</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {diff.map((d) => {
          const changed = d.before !== d.after;
          return (
            <tr key={d.field}>
              <td className="font-semibold text-ink-strong">{d.field}</td>
              <td>
                <span className={changed ? "bg-danger/8 text-danger px-1.5 py-0.5 rounded" : ""}>
                  {d.before}
                </span>
              </td>
              <td>
                <span
                  className={changed ? "bg-brandgreen/10 text-brandgreen px-1.5 py-0.5 rounded" : ""}
                >
                  {d.after}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The decision screen, ordered by what a person needs to answer "is this right?"
 *
 * What changed in the simplified build: the exact parameters, payload hash,
 * tool name, run id and approver group moved into a collapsed Technical details
 * block. None of it was removed — it is the evidence trail and it still prints
 * — but it sat above the diff and the reasoning, which is the wrong way round
 * for the person actually deciding. Platform owners get it open by default.
 */
export function ActionContract({ intent }: { intent: ActionIntent }) {
  const { decide, user, nowMs, detailDefaultOpen } = useStore();
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useState<Record<string, string>>(intent.parameters);
  const [note, setNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const dirty = JSON.stringify(params) !== JSON.stringify(intent.parameters);
  const expired = remaining(intent.expiresAt, nowMs).expired;
  const settled = intent.state !== "pending";

  return (
    <div className="space-y-4">
      <Panel flush>
        <div className="px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <h1 className="text-[19px] font-bold text-navy leading-snug">{intent.effect}</h1>
              <p className="text-[13px] text-ink mt-1.5">
                On{" "}
                <a
                  href={intent.target.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy font-semibold hover:underline"
                >
                  {intent.target.label}
                </a>
                , proposed by {intent.agentName}.
              </p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <RiskPill risk={intent.risk} />
              {intent.state === "executed" && <Tag tone="green">Approved</Tag>}
              {intent.state === "rejected" && <Tag tone="danger">Rejected</Tag>}
              {intent.state === "pending" && (
                <div className="text-[12.5px] text-ink">
                  <Countdown expiresAt={intent.expiresAt} /> to decide
                </div>
              )}
              {intent.monetaryImpact && (
                <div className="text-[14px] font-bold text-ink-strong tabular">
                  {intent.monetaryImpact}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 border-t border-line">
          <div className="px-4 py-3 bg-gold/6">
            <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-[#7a5f10]">
              Why this needs a person
            </div>
            <p className="text-[13px] text-ink-strong mt-1">{intent.riskReason}</p>
          </div>
          <div className="px-4 py-3 border-t md:border-t-0 md:border-l border-line">
            <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
              How well the evidence supports it
            </div>
            <div className="mt-1">
              <Confidence value={intent.confidence} basis={intent.confidenceBasis} />
            </div>
            {intent.confidence >= 0.9 && intent.risk === "high" && (
              <p className="text-[12px] text-[#7a5f10] mt-2 border-l-2 border-gold pl-2">
                Well evidenced and still high risk. A strong case is a reason to read it, not a
                reason to skip it.
              </p>
            )}
            {intent.confidence < 0.8 && (
              <p className="text-[12px] text-danger mt-2 border-l-2 border-danger pl-2">
                The agent could not fully corroborate this. Check the evidence below before
                approving, or reject and ask it to look again.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Panel title="What will change" flush>
          <DiffTable diff={intent.diff} />
        </Panel>

        <Panel title="Why the agent thinks so">
          <p className="text-[13px] text-ink-strong">{intent.reasoning}</p>
          <ul className="mt-3 space-y-2">
            {intent.citations.map((c) => (
              <li key={c.label} className="border-l-2 border-sage pl-3">
                <div className="text-[12.5px] font-semibold text-ink-strong">{c.label}</div>
                <div className="text-[12.5px] text-ink">{c.detail}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Everything an auditor needs and a decider does not need first. */}
      <Panel flush>
        <Detail defaultOpen={detailDefaultOpen}>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Field label="Intent">
              <span className="mono">{intent.id}</span>
            </Field>
            <Field label="Tool">
              <span className="mono">{intent.tool}</span>
            </Field>
            <Field label="System">{intent.system}</Field>
            <Field label="Approver group">
              <span className="mono">{intent.approverGroup}</span>
            </Field>
            <Field label="Requested by">{intent.requestedBy}</Field>
            <Field label="Raised">{stamp(intent.createdAt)}</Field>
            <Field label="Payload hash">
              <span className="mono">{intent.payloadHash}</span>
            </Field>
            <Field label="Run">
              <Link
                href={`/admin/runs/${intent.runId}`}
                className="text-navy font-semibold hover:underline mono"
              >
                {intent.runId}
              </Link>
            </Field>
          </dl>

          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink/70 font-sans">
              Exact parameters sent to the tool
            </h3>
            {!settled && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing((e) => !e);
                  if (editing) setParams(intent.parameters);
                }}
              >
                {editing ? "Discard edits" : "Edit payload"}
              </Button>
            )}
          </div>
          <table className="data-grid">
            <tbody>
              {Object.entries(params).map(([k, v]) => {
                const changed = intent.parameters[k] !== v;
                return (
                  <tr key={k}>
                    <td className="mono text-ink/80 w-[38%]">{k}</td>
                    <td>
                      {editing ? (
                        <input
                          value={v}
                          onChange={(e) => setParams({ ...params, [k]: e.target.value })}
                          aria-label={k}
                          className={`w-full border rounded-[6px] px-2 py-1 mono ${
                            changed ? "border-gold bg-gold/8" : "border-line"
                          }`}
                        />
                      ) : (
                        <span className={`mono ${changed ? "bg-gold/15 px-1 rounded" : ""}`}>
                          {v}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dirty && (
            <p className="text-[12.5px] text-[#7a5f10] bg-gold/10 border border-gold/30 rounded-[8px] px-3 py-2 mt-2">
              You have changed the payload, so it no longer matches what the agent proposed.
              Approving records a new hash and flags the change as human-edited.
            </p>
          )}
        </Detail>
      </Panel>

      {settled ? (
        <Panel title="Decision">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Field label="Outcome">
              {intent.state === "executed" ? "Approved and done" : "Rejected"}
            </Field>
            <Field label="Decided by">{intent.decidedBy}</Field>
            <Field label="When">{intent.decidedAt ? stamp(intent.decidedAt) : "-"}</Field>
          </div>
          {intent.decisionNote && (
            <p className="text-[13px] text-ink mt-3 border-l-2 border-line pl-3">
              {intent.decisionNote}
            </p>
          )}
        </Panel>
      ) : (
        <Panel title="Your decision">
          <label htmlFor="note" className="text-[12px] font-semibold text-ink-strong">
            Add a note {confirmReject && <span className="text-danger">(required to reject)</span>}
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional when approving. Kept permanently either way."
            className="w-full mt-1 border border-line rounded-[8px] px-3 py-2 text-[13px] bg-white"
          />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[12px] text-ink max-w-md">
              {expired
                ? "The window closed, so this has gone to the group owner."
                : `Approving as ${user.name}. The change is made and checked immediately after.`}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Link href="/">
                <Button variant="ghost">Decide later</Button>
              </Link>
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirmReject) {
                    setConfirmReject(true);
                    return;
                  }
                  if (note.trim()) decide(intent.id, "rejected", note);
                }}
              >
                {confirmReject ? "Confirm rejection" : "Reject"}
              </Button>
              <Button
                variant="primary"
                disabled={expired}
                onClick={() => decide(intent.id, "approved", note, dirty ? params : undefined)}
              >
                {dirty ? "Approve the edited change" : "Approve"}
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
