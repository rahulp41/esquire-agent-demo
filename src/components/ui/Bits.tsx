"use client";

import React from "react";
import type { PolicyVerdict, RiskTier, RunState, SystemOfRecord } from "@/lib/types";

export function Panel({
  title,
  subtitle,
  right,
  children,
  flush,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="bg-white border border-line rounded-[10px] overflow-hidden">
      {title && (
        <header className="flex items-start justify-between gap-4 px-4 py-3 border-b border-line">
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy">
              {title}
            </h2>
            {subtitle && <p className="text-[12.5px] text-ink mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function Tag({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "navy" | "green" | "gold" | "danger" | "sage";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-bgmuted text-ink border-line",
    navy: "bg-navy/8 text-navy border-navy/25",
    green: "bg-brandgreen/10 text-brandgreen border-brandgreen/30",
    sage: "bg-sage/15 text-brandgreen border-sage/40",
    gold: "bg-gold/15 text-[#7a5f10] border-gold/45",
    danger: "bg-danger/10 text-danger border-danger/35",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 border rounded-full px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function RiskPill({ risk }: { risk: RiskTier }) {
  const map = { low: "green", medium: "gold", high: "danger" } as const;
  return <Tag tone={map[risk]}>{risk.toUpperCase()} RISK</Tag>;
}

export function VerdictTag({ verdict }: { verdict: PolicyVerdict }) {
  if (verdict === "allowed") return <Tag tone="green">Allowed</Tag>;
  if (verdict === "approval-required") return <Tag tone="gold">Approval required</Tag>;
  return <Tag tone="danger">Blocked at gateway</Tag>;
}

const RUN_STATE_TONE: Record<RunState, "neutral" | "navy" | "green" | "gold" | "danger" | "sage"> = {
  intake: "neutral",
  planning: "neutral",
  "policy-check": "neutral",
  "awaiting-approval": "gold",
  executing: "navy",
  verifying: "navy",
  complete: "green",
  escalated: "danger",
  failed: "danger",
};

const RUN_STATE_LABEL: Record<RunState, string> = {
  intake: "Intake",
  planning: "Planning",
  "policy-check": "Policy check",
  "awaiting-approval": "Awaiting approval",
  executing: "Executing",
  verifying: "Verifying",
  complete: "Complete",
  escalated: "Escalated",
  failed: "Stopped",
};

export function RunStateTag({ state }: { state: RunState }) {
  return <Tag tone={RUN_STATE_TONE[state]}>{RUN_STATE_LABEL[state]}</Tag>;
}

/** Small colored square per system of record, so scanning a grid is fast. */
export function SystemChip({ system }: { system: SystemOfRecord }) {
  const colors: Record<SystemOfRecord, string> = {
    NetSuite: "#11213F",
    Salesforce: "#274069",
    "Microsoft 365": "#4B715B",
    Box: "#709E83",
    Atlassian: "#38537f",
    Zoom: "#8a8f98",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap">
      <span
        aria-hidden
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ background: colors[system] }}
      />
      {system}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">{label}</dt>
      <dd className="text-[13px] text-ink-strong mt-0.5">{children}</dd>
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-navy text-white border-navy hover:bg-navy-800",
    secondary: "bg-white text-navy border-[#aaabae] hover:border-navy-600",
    danger: "bg-white text-danger border-danger/50 hover:bg-danger/5",
    ghost: "bg-transparent text-navy border-transparent hover:bg-navy/5",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border rounded-[8px] px-3 py-[7px] text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 text-[13px] text-ink">
      <p className="max-w-md mx-auto">{children}</p>
    </div>
  );
}

/**
 * Operator detail, ranked below the thing a person came to do.
 *
 * The simplification rule for this build: nothing is deleted, it is ranked.
 * Hashes, correlation ids, tool names and policy rules still exist and still
 * matter — they are the evidence trail — but a paralegal deciding whether a
 * credit memo is right should not have to read past them. Platform owners get
 * these open by default, because for them the detail is the job.
 */
export function Detail({
  label = "Technical details",
  defaultOpen = false,
  children,
}: {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-t border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-4 py-2 flex items-center gap-2 text-[12px] text-ink hover:bg-[#f7f9fb]"
      >
        <span
          aria-hidden
          className={`text-ink/50 text-[10px] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        {label}
      </button>
      {open && <div className="px-4 pb-3.5">{children}</div>}
    </div>
  );
}

/**
 * How well the evidence supports a proposal.
 *
 * Shown beside risk, never instead of it. The two answer different questions —
 * "how sure is the case?" and "how much does it matter if it is wrong?" — and a
 * confident proposal that moves six thousand dollars still needs reading. The
 * bar is deliberately unshowy for that reason: it informs the decision, it does
 * not make it.
 */
export function Confidence({
  value,
  basis,
  size = "normal",
}: {
  value: number;
  basis?: string;
  size?: "normal" | "compact";
}) {
  const pct = Math.round(value * 100);
  const band =
    value >= 0.9
      ? { label: "Well evidenced", color: "var(--color-brandgreen)", tone: "text-brandgreen" }
      : value >= 0.8
        ? { label: "Reasonably evidenced", color: "var(--color-gold)", tone: "text-gold-600" }
        : { label: "Thin evidence", color: "var(--color-danger)", tone: "text-danger" };

  if (size === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={basis}>
        <span aria-hidden className="w-12 h-1.5 rounded-full bg-line overflow-hidden inline-block">
          <span
            className="block h-full rounded-full"
            style={{ width: `${pct}%`, background: band.color }}
          />
        </span>
        <span className={`text-[11.5px] font-semibold tabular ${band.tone}`}>{pct}%</span>
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`text-[15px] font-bold tabular ${band.tone}`}>{pct}%</span>
        <span className={`text-[12px] font-semibold ${band.tone}`}>{band.label}</span>
      </div>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Evidence confidence"
        className="w-full h-1.5 rounded-full bg-line overflow-hidden mt-1"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: band.color }}
        />
      </div>
      {basis && <p className="text-[12px] text-ink mt-1.5">{basis}</p>}
    </div>
  );
}
