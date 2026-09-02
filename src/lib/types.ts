/**
 * Domain model for the Esquire Agent Console.
 *
 * Every type here maps to a named element of the AI Reference Architecture
 * (v11, 27 Aug 2026). See ARCHITECTURE-MAP.md for the slide-by-slide crosswalk.
 */

/** Systems of record behind the Agent Gateway (slide 1, "SYSTEMS OF RECORD"). */
export type SystemOfRecord =
  | "NetSuite"
  | "Salesforce"
  | "Microsoft 365"
  | "Box"
  | "Atlassian"
  | "Zoom";

/** Who is sitting in front of the console. Drives nav, badges and permissions. */
export type Role = "requester" | "approver" | "platform";

export interface User {
  id: string;
  name: string;
  role: Role;
  /** Okta group that grants the role. Slide 1, "Okta - Identity". */
  oktaGroup: string;
  /**
   * Every group the person belongs to, including approver groups. This is what
   * decides which action items reach them: an approval is visible only to the
   * group named on the intent, never to everyone who happens to be logged in.
   */
  groups: string[];
  initials: string;
}

/** How an agent is triggered. Slide 1, "AI Agents - scheduled or event-driven". */
export type TriggerKind = "on-demand" | "scheduled" | "event";

/** Highest-impact write an agent is authorized to attempt. */
export type WriteTier = "read-only" | "low" | "medium" | "high";

export interface Agent {
  slug: string;
  name: string;
  summary: string;
  /** Business owner accountable for the agent package. */
  owner: string;
  team: string;
  /** Git ref of the signed Agent Package. Slide 2, "Agent Packages". */
  version: string;
  trigger: TriggerKind;
  triggerDetail: string;
  systems: SystemOfRecord[];
  writeTier: WriteTier;
  /** Tool bundle granted at the gateway for this agent's workload identity. */
  tools: string[];
  /** Latest CI eval score. Slide 2, "Evaluation - CI gates + production thresholds". */
  evalScore: number;
  evalThreshold: number;
  runsThisMonth: number;
  medianRunSeconds: number;
  /**
   * Groups whose members may run this agent.
   *
   * Separate from the approver group named on its ActionIntents, and
   * deliberately so: being allowed to ask an agent to look at something is not
   * the same permission as being allowed to authorize what it proposes.
   * Platform owners bypass this.
   */
  entitledGroups: string[];
  status: "live" | "canary" | "paused";
}

/** Gateway verdict on a single tool call. Slide 1/2, MintMCP policy enforcement. */
export type PolicyVerdict = "allowed" | "approval-required" | "blocked";

export interface ToolCall {
  id: string;
  tool: string;
  system: SystemOfRecord;
  /** Human-readable summary of what the call does. */
  intent: string;
  parameters: Record<string, string>;
  verdict: PolicyVerdict;
  /** Named policy rule that produced the verdict. */
  rule: string;
  /** Milliseconds at the gateway, for the observability plane. */
  latencyMs: number;
  /** Set when verdict is "approval-required" and an intent was raised. */
  actionIntentId?: string;
  resultSummary?: string;
}

export type RiskTier = "low" | "medium" | "high";

/**
 * ActionIntent - the immutable proposal a model makes before anything is written.
 * Slide 2: "Runtime -> immutable ActionIntent -> Ledger <-> approval decision".
 */
export interface ActionIntent {
  id: string;
  runId: string;
  agentSlug: string;
  agentName: string;
  createdAt: string;
  /** Expiry of the approval window. Past expiry the orchestrator escalates. */
  expiresAt: string;
  requestedBy: string;
  /** Okta group that must approve. */
  approverGroup: string;
  system: SystemOfRecord;
  tool: string;
  /** One-line statement of the effect, written for a non-engineer. */
  effect: string;
  /** Exact parameters that will be sent to the tool. Nothing hidden. */
  parameters: Record<string, string>;
  /** The record being changed, with a deep link into the system of record. */
  target: { label: string; recordId: string; url: string };
  /** Field-level before/after. Empty for create-only actions. */
  diff: { field: string; before: string; after: string }[];
  risk: RiskTier;
  /** Why the policy engine classified it at this risk tier. */
  riskReason: string;
  /**
   * How well the evidence supports the proposal, 0 to 1.
   *
   * This is a property of the *case the agent built*, not of the model feeling
   * sure of itself: how completely the records answer the question, whether any
   * source contradicts another, and whether the pattern matches ones already
   * settled the same way. It is deliberately shown next to risk and never
   * instead of it — a confident proposal that moves money still needs reading.
   */
  confidence: number;
  /** What drove the score, in one sentence a person can check. */
  confidenceBasis: string;
  /** SHA-256 over the canonicalized payload. Editing produces a new hash. */
  payloadHash: string;
  /** Dollar value at stake, where the action has one. */
  monetaryImpact?: string;
  reasoning: string;
  citations: { label: string; detail: string }[];
  state: "pending" | "approved" | "rejected" | "executed" | "expired";
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  /** Set when an approver edited the payload before approving. */
  editedFrom?: string;
  receiptId?: string;
}

/** Durable orchestration states. Slide 2, Step Functions Standard. */
export type RunState =
  | "intake"
  | "planning"
  | "policy-check"
  | "awaiting-approval"
  | "executing"
  | "verifying"
  | "complete"
  | "escalated"
  | "failed";

export interface RunStep {
  id: string;
  label: string;
  detail: string;
  state: "done" | "active" | "waiting" | "pending" | "failed";
  at?: string;
  durationMs?: number;
  /** Retry count surfaced from the orchestrator's execution history. */
  attempts?: number;
  note?: string;
}

export interface Run {
  id: string;
  agentSlug: string;
  agentName: string;
  title: string;
  startedBy: string;
  trigger: TriggerKind;
  startedAt: string;
  state: RunState;
  /** Correlation ID stitched across every asynchronous boundary. */
  correlationId: string;
  steps: RunStep[];
  toolCalls: ToolCall[];
  intentIds: string[];
  costUsd: number;
  tokens: number;
}

/** Append-only Business Ledger row. Slide 2, PostgreSQL business truth. */
export type LedgerKind =
  | "intent"
  | "approval"
  | "rejection"
  | "attempt"
  | "receipt"
  | "policy-block"
  | "escalation"
  | "config-change";

export interface LedgerEntry {
  id: string;
  at: string;
  kind: LedgerKind;
  runId: string;
  correlationId: string;
  actor: string;
  system?: SystemOfRecord;
  summary: string;
  /** Evidence pointer into S3. Slide 2, "S3 = evidence". */
  evidenceKey?: string;
  payloadHash?: string;
}

export interface ChatMessage {
  id: string;
  author: "user" | "agent";
  text: string;
  at: string;
  /** Tool calls the agent made while producing this message. */
  toolCalls?: ToolCall[];
  /** Set when the agent is asking for inline confirmation of a write. */
  pendingWrite?: {
    toolCallId: string;
    confirmLabel: string;
    intentId: string;
  };
}

/* ------------------------------------------------------------------------- *
 * Admin surface — agent configuration
 *
 * Three concepts and that is the whole model, following the interface design
 * Andrew Megli proved out in the Agent Ensemble prototype (Engineering Team
 * Wiki, 19 Aug 2026):
 *
 *   an AGENT      is the service identity the work happens as
 *   a  RUNBOOK    is the instructions it follows, in plain English
 *   an AUTOMATION pairs the two and decides what starts a run
 *
 * Visible only to platform owners. See ARCHITECTURE-MAP.md.
 * ------------------------------------------------------------------------- */

/** What makes an automation start working. */
export type TriggerType = "schedule" | "filter" | "mention" | "assignment";

export interface Trigger {
  type: TriggerType;
  /** For "schedule": how often, in hours. */
  everyHours?: number;
  /** For "filter": the query the automation watches. */
  query?: string;
  /** For "mention" and "assignment": which queue is watched. */
  scope?: string;
}

export interface Automation {
  id: string;
  name: string;
  /** Agent identity, keyed to Agent.slug so the admin and end-user views agree. */
  agentSlug: string;
  runbookId: string;
  trigger: Trigger;
  enabled: boolean;
  owner: string;
  /** Concurrent runs this automation may hold. */
  concurrency: number;
  lastPollAt?: string;
  runsLast24h: number;
  /** Overrides of the runbook defaults. Empty means "inherit". */
  overrides: Partial<RunbookDefaults>;
}

/**
 * Everything that is not one of the three questions lives here with a working
 * default, so the automation builder stays three steps deep.
 */
export interface RunbookDefaults {
  model: string;
  /** Which systems the agent may read, and how widely. */
  readScope: string;
  /** Where the work item lands when the agent finishes. */
  targetStatus: string;
  wallClockCapMinutes: number;
  retryCap: number;
}

export interface RunbookVersion {
  version: number;
  at: string;
  author: string;
  note: string;
  body: string;
}

export interface Runbook {
  id: string;
  name: string;
  summary: string;
  owner: string;
  /** The instructions, in plain English. This is where the leverage is. */
  body: string;
  /** Snippet ids pulled in at compose time. */
  includes: string[];
  defaults: RunbookDefaults;
  updatedAt: string;
  /** Most recent first, capped at ten. */
  versions: RunbookVersion[];
}

/** Reusable sections. Edit once and every runbook that includes it changes. */
export interface Snippet {
  id: string;
  name: string;
  summary: string;
  body: string;
  /** Standalone material the agent reads on demand rather than every run. */
  onDemand?: boolean;
}

export interface ModelEntry {
  id: string;
  label: string;
  servedVia: string;
  /** Highest write tier this model is cleared to drive. */
  approvedUpTo: WriteTier;
  contextWindow: string;
  inputPer1M: number;
  outputPer1M: number;
  status: "approved" | "evaluating" | "retired";
  note: string;
}

/**
 * An agent that hit something it could not decide, said so on the work item,
 * named a person, and stopped. It resumes as a revision run when answered.
 */
export interface AgentQuestion {
  id: string;
  automationId: string;
  agentSlug: string;
  workItem: string;
  workItemUrl: string;
  askedAt: string;
  question: string;
  mentioned: string;
  state: "waiting" | "answered";
}

export type EnsembleOutcome =
  | "diagnosis"
  | "change-proposed"
  | "asked-a-question"
  | "no-action"
  | "failed";

/** One ticket-scoped agent run, as the control room sees it. */
export interface EnsembleRun {
  id: string;
  automationId: string;
  agentSlug: string;
  workItem: string;
  workItemUrl: string;
  title: string;
  startedAt: string;
  durationMs?: number;
  /** Model turns consumed. */
  turns: number;
  state: "running" | "waiting" | "done" | "failed";
  outcome?: EnsembleOutcome;
  costUsd: number;
  /** The throwaway sandbox this run held. Destroyed on exit. */
  sandbox: string;
  note?: string;
}
