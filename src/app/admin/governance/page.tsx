"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Panel, Tag } from "@/components/ui/Bits";
import { usd } from "@/lib/format";

/**
 * Slide 4 of the reference architecture, made concrete: the guardrails and the
 * pilot exit criteria, shown against the state of the seeded environment.
 */

const POLICY_RULES = [
  {
    rule: "finance.write.credit_memo",
    condition: "amount > $1,000",
    outcome: "approval-required",
    group: "esq-ai-approvers-finance",
  },
  {
    rule: "finance.write.credit_memo",
    condition: "amount <= $1,000",
    outcome: "allowed",
    group: "auto, receipt required",
  },
  {
    rule: "finance.write.invoice_reissue",
    condition: "any change of billing entity",
    outcome: "approval-required",
    group: "esq-ai-approvers-finance",
  },
  {
    rule: "scheduling.write.book_vendor",
    condition: "any external vendor commitment",
    outcome: "approval-required",
    group: "esq-ai-approvers-scheduling",
  },
  {
    rule: "om.write.worksheet_status",
    condition: "any worksheet production status change",
    outcome: "approval-required",
    group: "esq-ai-approvers-om",
  },
  {
    rule: "scheduling.write.assign_reporter",
    condition: "any staffing commitment",
    outcome: "approval-required",
    group: "esq-ai-approvers-scheduling",
  },
  {
    rule: "itsupport.write.metadata",
    condition: "labels, components, links",
    outcome: "allowed",
    group: "auto, receipt required",
  },
  {
    rule: "itsupport.write.public_comment",
    condition: "jsdPublic = true",
    outcome: "approval-required",
    group: "esq-ai-approvers-itsupport",
  },
  {
    rule: "box.write.external_collaborator",
    condition: "recipient outside the tenant",
    outcome: "approval-required",
    group: "esq-ai-approvers-clientsuccess",
  },
  {
    rule: "expense.write.report",
    condition: "any unattributed line",
    outcome: "blocked",
    group: "no override path",
  },
  {
    rule: "gateway.scope",
    condition: "tool not granted to the workload",
    outcome: "blocked",
    group: "package change required",
  },
];

const GUARDRAILS = [
  {
    n: 1,
    title: "Identity and authorization",
    points: [
      "Actor where present, plus workload identity, on every action",
      "Audience-bound token exchange, least privilege",
      "No shared high-privilege credentials",
    ],
  },
  {
    n: 2,
    title: "Reliable writes",
    points: [
      "Immutable ActionIntent with a payload hash and a TTL",
      "Idempotency and dedupe adapter, receipt and read-back",
      "Outbox relay is at-least-once",
    ],
  },
  {
    n: 3,
    title: "Recovery and scale",
    points: [
      "Step Functions Standard with callback timeouts",
      "Queue backpressure and a dead-letter queue",
      "Concurrency, rate and cost budgets",
    ],
  },
  {
    n: 4,
    title: "Runtime containment",
    points: [
      "Ephemeral task with per-task IAM",
      "Egress allowlist, secrets held at the tool boundary",
      "Kill, restart and unknown-outcome tests",
    ],
  },
  {
    n: 5,
    title: "Telemetry and data",
    points: [
      "Correlated ids across asynchronous boundaries",
      "Redaction before telemetry leaves, prompts off by default",
      "Retention, access and investigation runbooks",
    ],
  },
  {
    n: 6,
    title: "Evaluation and knowledge",
    points: [
      "CI gates for tools, policy, quality and injection",
      "Production thresholds trigger rollback",
      "Retrieval staged: ACLs, citations, freshness and deletion",
    ],
  },
];

const EXIT_CRITERIA = [
  { word: "Zero", rest: "duplicate side effects" },
  { word: "Blocked", rest: "cross-user access" },
  { word: "Complete", rest: "correlated evidence trail" },
  { word: "Recovered", rest: "killed workers and stale approvals" },
  { word: "Proven", rest: "canary rollback with cost and latency limits" },
];

export default function GovernancePage() {
  const { agents, runs, ledger, intents } = useStore();

  const belowGate = agents.filter((a) => a.evalScore < a.evalThreshold);
  const canaries = agents.filter((a) => a.status === "canary");
  const blocks = ledger.filter((l) => l.kind === "policy-block").length;
  const escalations = ledger.filter((l) => l.kind === "escalation").length;
  const receipts = ledger.filter((l) => l.kind === "receipt").length;
  const attempts = ledger.filter((l) => l.kind === "attempt").length;
  const spend = runs.reduce((n, r) => n + r.costUsd, 0);
  const decided = intents.filter((i) => i.state !== "pending").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold text-navy leading-tight">Governance</h1>
        <p className="text-[13.5px] text-ink mt-1 max-w-3xl">
          What the platform enforces, and where the seeded environment currently stands against
          it. The policy table is the deterministic layer: it decides outcomes before a model
          gets a vote, and it is the same table the gateway evaluates at runtime.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Agents live", value: String(agents.length - canaries.length) },
          { label: "On canary", value: String(canaries.length) },
          { label: "Below eval gate", value: String(belowGate.length), bad: belowGate.length > 0 },
          { label: "Policy blocks", value: String(blocks) },
          { label: "Escalations", value: String(escalations) },
          { label: "Spend, runs shown", value: usd(spend) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-line rounded-[10px] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
              {s.label}
            </div>
            <div
              className={`text-[20px] font-bold tabular mt-1 font-[family-name:var(--font-display)] ${
                s.bad ? "text-danger" : "text-navy"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Panel
        title="Deterministic policy table"
        subtitle="Evaluated at the gateway on every tool call, before the call reaches a system of record."
        flush
      >
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Condition</th>
                <th>Outcome</th>
                <th>Approver group</th>
              </tr>
            </thead>
            <tbody>
              {POLICY_RULES.map((r, i) => (
                <tr key={`${r.rule}-${i}`}>
                  <td className="mono text-ink-strong">{r.rule}</td>
                  <td className="text-[12.5px]">{r.condition}</td>
                  <td>
                    {r.outcome === "allowed" && <Tag tone="green">Allowed</Tag>}
                    {r.outcome === "approval-required" && <Tag tone="gold">Approval required</Tag>}
                    {r.outcome === "blocked" && <Tag tone="danger">Blocked</Tag>}
                  </td>
                  <td className="mono text-ink/80">{r.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Panel title="Production guardrails" subtitle="Six control families that must hold before scale.">
          <div className="grid sm:grid-cols-2 gap-3">
            {GUARDRAILS.map((g) => (
              <div key={g.n} className="border border-line rounded-[8px] p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy text-white grid place-items-center text-[11px] font-bold">
                    {g.n}
                  </span>
                  <h3 className="text-[13px] font-bold text-navy">{g.title}</h3>
                </div>
                <ul className="mt-2 space-y-1">
                  {g.points.map((p) => (
                    <li key={p} className="text-[12.5px] text-ink flex gap-2">
                      <span aria-hidden className="text-sage mt-[1px]">
                        ·
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Pilot exit criteria"
            subtitle="All five must be demonstrated under security and failure-injection tests."
          >
            <ul className="space-y-2">
              {EXIT_CRITERIA.map((c) => (
                <li key={c.word} className="flex items-baseline gap-3 border-b border-line pb-2 last:border-0">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-gold-600 min-w-[86px]">
                    {c.word}
                  </span>
                  <span className="text-[13px] text-ink-strong">{c.rest}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-ink mt-3">
              Recommended first slice: one agent, one system, one read, one controlled write, one
              approval screen, and a complete trace. Everything in this prototype is scoped to
              that shape.
            </p>
          </Panel>

          <Panel title="Evidence completeness, seeded environment">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  Write attempts
                </dt>
                <dd className="text-[18px] font-bold text-navy tabular">{attempts}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  Verified receipts
                </dt>
                <dd
                  className={`text-[18px] font-bold tabular ${
                    receipts >= attempts ? "text-brandgreen" : "text-danger"
                  }`}
                >
                  {receipts}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  Intents decided
                </dt>
                <dd className="text-[18px] font-bold text-navy tabular">
                  {decided} / {intents.length}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  Unreceipted writes
                </dt>
                <dd
                  className={`text-[18px] font-bold tabular ${
                    attempts - receipts > 0 ? "text-gold-600" : "text-brandgreen"
                  }`}
                >
                  {Math.max(0, attempts - receipts)}
                </dd>
              </div>
            </dl>
            <p className="text-[12.5px] text-ink mt-3">
              A write with no matching receipt is the signal that matters. It means the platform
              cannot prove what happened, which is treated as a failure even when the write
              succeeded.{" "}
              <Link href="/admin/activity" className="text-navy font-semibold underline">
                Inspect the ledger
              </Link>
              .
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
