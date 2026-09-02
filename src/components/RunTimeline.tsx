"use client";

import type { RunStep } from "@/lib/types";
import { duration, timeOf } from "@/lib/format";

const DOT: Record<RunStep["state"], string> = {
  done: "bg-brandgreen border-brandgreen",
  active: "bg-navy border-navy animate-pulse",
  waiting: "bg-gold border-gold",
  pending: "bg-white border-line",
  failed: "bg-danger border-danger",
};

const NOTE: Record<RunStep["state"], string> = {
  done: "",
  active: "running now",
  waiting: "paused, waiting on a human",
  pending: "not started",
  failed: "stopped here",
};

/**
 * The orchestrator's execution history, rendered for a business user.
 * Slide 2: Step Functions owns sequencing, timers, retries, callback waits,
 * timeout, escalation and cancellation.
 */
export function RunTimeline({ steps }: { steps: RunStep[] }) {
  return (
    <ol className="relative">
      {steps.map((s, idx) => (
        <li key={s.id} className="relative pl-7 pb-4 last:pb-0">
          {idx < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[7px] top-4 bottom-0 w-px bg-line"
            />
          )}
          <span
            aria-hidden
            className={`absolute left-0 top-[3px] w-[15px] h-[15px] rounded-full border-2 ${DOT[s.state]}`}
          />
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span
              className={`text-[13.5px] font-bold ${
                s.state === "pending" ? "text-ink/50" : "text-ink-strong"
              }`}
            >
              {s.label}
            </span>
            {s.at && <span className="mono text-ink/60">{timeOf(s.at)} ET</span>}
            {s.durationMs !== undefined && (
              <span className="mono text-ink/60">{duration(s.durationMs)}</span>
            )}
            {s.attempts !== undefined && s.attempts > 1 && (
              <span className="text-[11.5px] font-semibold text-gold-600">
                {s.attempts} attempts
              </span>
            )}
            {NOTE[s.state] && (
              <span
                className={`text-[11.5px] font-semibold ${
                  s.state === "failed"
                    ? "text-danger"
                    : s.state === "waiting"
                      ? "text-gold-600"
                      : s.state === "active"
                        ? "text-navy"
                        : "text-ink/50"
                }`}
              >
                {NOTE[s.state]}
              </span>
            )}
          </div>
          <p
            className={`text-[12.5px] mt-0.5 ${
              s.state === "pending" ? "text-ink/50" : "text-ink"
            }`}
          >
            {s.detail}
          </p>
          {s.note && (
            <p className="text-[12px] text-ink mt-1 border-l-2 border-line pl-2.5">{s.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
