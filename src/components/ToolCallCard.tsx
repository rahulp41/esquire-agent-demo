"use client";

import Link from "next/link";
import { useState } from "react";
import type { ToolCall } from "@/lib/types";
import { useStore } from "@/lib/store";
import { duration } from "@/lib/format";

/**
 * What the agent just did, in a sentence.
 *
 * The full call — tool name, parameters, the policy rule that produced the
 * verdict, latency — is still here, one click away, and open by default for
 * platform owners. For everyone else the headline is plain English, because
 * "netsuite.modify_record" tells a scheduler nothing that "assigned the
 * reporter" does not tell them better.
 */
export function ToolCallCard({ call }: { call: ToolCall }) {
  const { detailDefaultOpen } = useStore();
  const [open, setOpen] = useState(detailDefaultOpen);

  const edge =
    call.verdict === "blocked"
      ? "border-l-danger"
      : call.verdict === "approval-required"
        ? "border-l-gold"
        : "border-l-sage";

  const headline =
    call.verdict === "blocked"
      ? "Refused"
      : call.verdict === "approval-required"
        ? "Needs your approval"
        : "Done";

  const headlineTone =
    call.verdict === "blocked"
      ? "text-danger"
      : call.verdict === "approval-required"
        ? "text-gold-600"
        : "text-brandgreen";

  return (
    <div className={`border border-line border-l-[3px] ${edge} rounded-[8px] bg-white`}>
      <div className="px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-[12px] font-bold ${headlineTone}`}>{headline}</span>
          <span className="text-[13px] text-ink-strong flex-1 min-w-[180px]">{call.intent}</span>
          <span className="text-[11.5px] text-ink/60">{call.system}</span>
        </div>
        {call.resultSummary && (
          <p className="text-[12.5px] text-ink mt-1">{call.resultSummary}</p>
        )}
        {call.actionIntentId && (
          <Link
            href={`/approvals/${call.actionIntentId}`}
            className="inline-block text-[12.5px] font-semibold text-navy underline mt-1"
          >
            Review the change
          </Link>
        )}
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-3 py-1.5 border-t border-line text-[12px] font-bold uppercase tracking-[0.06em] text-ink/70 font-[family-name:var(--font-display)] hover:bg-[#f7f9fb] flex items-center gap-2"
      >
        <span
          aria-hidden
          className={`text-ink/50 text-[9px] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        Technical details
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-line">
          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
              Tool
            </div>
            <div className="mono text-ink-strong">{call.tool}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
              Policy rule applied
            </div>
            <div className="mono text-ink-strong">{call.rule}</div>
          </div>
          {Object.keys(call.parameters).length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                Parameters
              </div>
              <dl className="mt-0.5">
                {Object.entries(call.parameters).map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-[1px]">
                    <dt className="mono text-ink/70 min-w-[140px]">{k}</dt>
                    <dd className="mono text-ink-strong break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="mono text-[11.5px] text-ink/60">
            {duration(call.latencyMs)} at the gateway
          </div>
        </div>
      )}
    </div>
  );
}
