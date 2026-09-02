"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type {
  ActionIntent,
  AgentQuestion,
  Automation,
  EnsembleRun,
  LedgerEntry,
  ModelEntry,
  Role,
  Run,
  Runbook,
  Snippet,
  User,
} from "./types";
import { AGENTS, DEMO_NOW, INTENTS, LEDGER, RUNS, USERS } from "./seed";
import {
  scopedAgents,
  scopedIntents,
  scopedQuestions,
  scopedRuns,
} from "./scope";
import {
  AUTOMATIONS,
  ENSEMBLE_RUNS,
  MODELS,
  QUESTIONS,
  RUNBOOKS,
  SNIPPETS,
} from "./admin-seed";

/**
 * Client-side demo store.
 *
 * In production the state below lives in the Business Ledger (PostgreSQL) and
 * the Step Functions execution history. The prototype keeps it in a reducer so
 * an approval decision visibly propagates: the intent settles, the ledger gains
 * an approval, an attempt and a receipt, and the paused run resumes and
 * completes. That propagation is the point of the demo.
 */

interface State {
  currentUserId: string;
  intents: ActionIntent[];
  runs: Run[];
  ledger: LedgerEntry[];
  /** Ledger row ids added during this session, so the UI can highlight them. */
  fresh: string[];
  /** False until persisted state has been read back on the client. */
  hydrated: boolean;
  /**
   * Monotonic id counter. It lives in state, not in a module variable, because
   * state survives a reload through sessionStorage and a module variable does
   * not — a reset counter reissues ids that are already on the ledger.
   */
  seq: number;

  // Admin surface. Only platform owners can reach the screens that read these.
  automations: Automation[];
  runbooks: Runbook[];
  snippets: Snippet[];
  models: ModelEntry[];
  questions: AgentQuestion[];
  ensembleRuns: EnsembleRun[];
}

type Action =
  | { type: "set-user"; userId: string }
  | {
      type: "decide";
      intentId: string;
      decision: "approved" | "rejected";
      by: string;
      /** Stamped from the demo clock so new rows sort after the seeded ones. */
      at: string;
      note: string;
      editedParameters?: Record<string, string>;
    }
  | { type: "hydrate"; state: State }
  | { type: "toggle-automation"; id: string; by: string; at: string }
  | { type: "save-automation"; automation: Automation; by: string; at: string; isNew: boolean }
  | {
      type: "save-runbook";
      id: string;
      body: string;
      includes: string[];
      defaults: Runbook["defaults"];
      note: string;
      by: string;
      at: string;
    }
  | { type: "restore-runbook"; id: string; version: number; by: string; at: string };

const initial: State = {
  currentUserId: USERS[0].id,
  intents: INTENTS,
  runs: RUNS,
  ledger: LEDGER,
  fresh: [],
  hydrated: false,
  seq: 100,
  automations: AUTOMATIONS,
  runbooks: RUNBOOKS,
  snippets: SNIPPETS,
  models: MODELS,
  questions: QUESTIONS,
  ensembleRuns: ENSEMBLE_RUNS,
};

/**
 * Demo state survives a page reload so a walkthrough is not lost by an
 * accidental refresh. "Reset demo" in the header clears it and returns every
 * intent, run and ledger row to the seeded starting position.
 */
const STORAGE_KEY = "esq-agent-console-demo";

/**
 * Bump whenever the shape of State changes. A saved blob written by an older
 * build is discarded rather than trusted: restoring it would leave newly added
 * fields undefined, and the first component to read one takes the whole app
 * down. This is exactly what happened when the admin surface was added, so the
 * merge below is belt and braces on top of the version check.
 */
const STATE_VERSION = 2;

function load(): State {
  const fresh = { ...initial, hydrated: true };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;

    const saved = JSON.parse(raw) as Partial<State> & { version?: number };
    if (saved.version !== STATE_VERSION) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return fresh;
    }

    // Spread over `initial`, never in place of it, so a key the saved blob does
    // not carry falls back to seed data instead of becoming undefined.
    return { ...initial, ...saved, hydrated: true };
  } catch {
    // Corrupt or unreadable. Start clean rather than half-restored.
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing more to do */
    }
    return fresh;
  }
}

export function resetDemo() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing, nothing to clear */
  }
  window.location.href = "/";
}

/** Issues ids from a counter the caller threads through, and hands it back. */
function issuer(start: number) {
  let n = start;
  return {
    next: (prefix: string) => `${prefix}-${++n}`,
    get value() {
      return n;
    },
  };
}

/** Every mutation is stamped from the demo clock so new rows sort after seeded ones. */
const stampAt = (driftMs: number) => new Date(DEMO_NOW.getTime() + driftMs).toISOString();

/** Stable pseudo-hash so an edited payload visibly gets a new one. */
function rehash(params: Record<string, string>): string {
  let h = 0x811c9dc5;
  for (const [k, v] of Object.entries(params).sort()) {
    for (const ch of `${k}=${v};`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  const hex = h.toString(16).padStart(8, "0");
  return `sha256:${hex}${hex.split("").reverse().join("")}…${hex.slice(0, 4)}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "set-user":
      return { ...state, currentUserId: action.userId };

    case "decide": {
      const intent = state.intents.find((i) => i.id === action.intentId);
      if (!intent || intent.state !== "pending") return state;

      const at = action.at;
      const ids = issuer(state.seq);
      const edited = action.editedParameters;
      const parameters = edited ?? intent.parameters;
      const approved = action.decision === "approved";
      const receiptId = approved ? ids.next("RCPT") : undefined;

      const updatedIntent: ActionIntent = {
        ...intent,
        parameters,
        payloadHash: edited ? rehash(parameters) : intent.payloadHash,
        editedFrom: edited ? intent.payloadHash : undefined,
        state: approved ? "executed" : "rejected",
        decidedBy: action.by,
        decidedAt: at,
        decisionNote: action.note,
        receiptId,
      };

      const newLedger: LedgerEntry[] = [];
      const push = (e: Omit<LedgerEntry, "id" | "at" | "runId" | "correlationId">) =>
        newLedger.push({
          id: ids.next("L"),
          at,
          runId: intent.runId,
          correlationId:
            state.runs.find((r) => r.id === intent.runId)?.correlationId ?? "cid-unknown",
          ...e,
        });

      if (approved) {
        push({
          kind: "approval",
          actor: `user:${action.by}`,
          summary: edited
            ? `${intent.id} approved with an edited payload - superseded hash ${intent.payloadHash}`
            : `${intent.id} approved - payload unchanged, hash matched`,
          payloadHash: updatedIntent.payloadHash,
        });
        push({
          kind: "attempt",
          actor: `agent:${intent.agentSlug}`,
          system: intent.system,
          summary: `${intent.tool} on ${intent.target.recordId} - attempt 1, idempotency key accepted`,
          payloadHash: updatedIntent.payloadHash,
        });
        push({
          kind: "receipt",
          actor: `agent:${intent.agentSlug}`,
          system: intent.system,
          summary: `${receiptId} - ${intent.target.label} read-back confirmed`,
          payloadHash: updatedIntent.payloadHash,
          evidenceKey: `s3://esq-ai-evidence/2026/08/28/${receiptId}/`,
        });
      } else {
        push({
          kind: "rejection",
          actor: `user:${action.by}`,
          summary: `${intent.id} rejected - ${action.note || "no note given"}`,
          payloadHash: intent.payloadHash,
        });
      }

      const runs = state.runs.map((run) => {
        if (run.id !== intent.runId) return run;
        const steps = run.steps.map((s) => {
          if (s.state === "waiting") {
            return {
              ...s,
              state: "done" as const,
              detail: approved
                ? `Approved by ${action.by}.${edited ? " Payload was edited, so a new approval hash was recorded." : ""}`
                : `Rejected by ${action.by}. The orchestrator cancelled the write path.`,
              at,
            };
          }
          if (s.state !== "pending") return s;
          if (!approved) {
            return {
              ...s,
              state: "failed" as const,
              detail: "Skipped. The run terminated on rejection with no side effects.",
            };
          }
          return {
            ...s,
            state: "done" as const,
            at,
            durationMs: s.label.startsWith("Execute") ? 640 : 420,
            attempts: 1,
          };
        });
        return {
          ...run,
          state: (approved ? "complete" : "failed") as Run["state"],
          steps,
          toolCalls: run.toolCalls.map((t) =>
            t.actionIntentId === intent.id
              ? {
                  ...t,
                  resultSummary: approved
                    ? "Approved and executed. Read-back confirmed."
                    : "Rejected by the approver. Nothing was written.",
                }
              : t,
          ),
        };
      });

      return {
        ...state,
        intents: state.intents.map((i) => (i.id === intent.id ? updatedIntent : i)),
        runs,
        ledger: [...newLedger.reverse(), ...state.ledger],
        fresh: [...newLedger.map((e) => e.id), ...state.fresh],
        seq: ids.value,
      };
    }

    /* ---------------------------------------------------- admin: config -- */

    case "toggle-automation": {
      const a = state.automations.find((x) => x.id === action.id);
      if (!a) return state;
      const enabled = !a.enabled;
      return {
        ...state,
        automations: state.automations.map((x) =>
          x.id === action.id ? { ...x, enabled } : x,
        ),
        ...appendConfigChange(state, {
          at: action.at,
          actor: `user:${action.by}`,
          summary: `Automation ${a.name} ${enabled ? "resumed" : "paused"}`,
        }),
      };
    }

    case "save-automation": {
      const { automation, isNew } = action;
      const automations = isNew
        ? [...state.automations, automation]
        : state.automations.map((x) => (x.id === automation.id ? automation : x));
      return {
        ...state,
        automations,
        ...appendConfigChange(state, {
          at: action.at,
          actor: `user:${action.by}`,
          summary: isNew
            ? `Automation ${automation.name} created, running ${automation.runbookId} as ${automation.agentSlug}`
            : `Automation ${automation.name} updated`,
        }),
      };
    }

    case "save-runbook": {
      const rb = state.runbooks.find((x) => x.id === action.id);
      if (!rb) return state;
      const version = (rb.versions[0]?.version ?? 0) + 1;
      const updated: Runbook = {
        ...rb,
        body: action.body,
        includes: action.includes,
        defaults: action.defaults,
        updatedAt: action.at,
        // Ten versions kept, oldest dropped.
        versions: [
          { version, at: action.at, author: action.by, note: action.note, body: action.body },
          ...rb.versions,
        ].slice(0, 10),
      };
      const dependents = state.automations.filter((a) => a.runbookId === rb.id).length;
      return {
        ...state,
        runbooks: state.runbooks.map((x) => (x.id === rb.id ? updated : x)),
        ...appendConfigChange(state, {
          at: action.at,
          actor: `user:${action.by}`,
          summary: `Runbook ${rb.name} saved as v${version}, live on the next run for ${dependents} automation${dependents === 1 ? "" : "s"}`,
        }),
      };
    }

    case "restore-runbook": {
      const rb = state.runbooks.find((x) => x.id === action.id);
      const target = rb?.versions.find((v) => v.version === action.version);
      if (!rb || !target) return state;
      const version = (rb.versions[0]?.version ?? 0) + 1;
      const updated: Runbook = {
        ...rb,
        body: target.body,
        updatedAt: action.at,
        versions: [
          {
            version,
            at: action.at,
            author: action.by,
            note: `Restored v${target.version}`,
            body: target.body,
          },
          ...rb.versions,
        ].slice(0, 10),
      };
      return {
        ...state,
        runbooks: state.runbooks.map((x) => (x.id === rb.id ? updated : x)),
        ...appendConfigChange(state, {
          at: action.at,
          actor: `user:${action.by}`,
          summary: `Runbook ${rb.name} rolled back to v${target.version}, saved as v${version}`,
        }),
      };
    }

    default:
      return state;
  }
}

/**
 * Configuration changes are business truth too. They land on the same ledger as
 * approvals and receipts, so an auditor reads one trail rather than two.
 */
function appendConfigChange(
  state: State,
  entry: { at: string; actor: string; summary: string },
): Pick<State, "ledger" | "fresh" | "seq"> {
  const ids = issuer(state.seq);
  const row: LedgerEntry = {
    id: ids.next("L"),
    at: entry.at,
    kind: "config-change",
    runId: "-",
    correlationId: "config",
    actor: entry.actor,
    summary: entry.summary,
  };
  return { ledger: [row, ...state.ledger], fresh: [row.id, ...state.fresh], seq: ids.value };
}

interface Ctx extends State {
  user: User;
  users: User[];
  role: Role;
  setUser: (id: string) => void;
  decide: (
    intentId: string,
    decision: "approved" | "rejected",
    note: string,
    editedParameters?: Record<string, string>,
  ) => void;
  pendingIntents: ActionIntent[];
  /** Live-ticking clock, anchored to the demo instant. */
  nowMs: number;
  agents: typeof AGENTS;
  reset: () => void;
  isAdmin: boolean;
  /** Action items addressed to the signed-in person, not to everyone. */
  myIntents: ActionIntent[];
  myPendingIntents: ActionIntent[];
  myQuestions: AgentQuestion[];
  myRuns: Run[];
  /** Agents the signed-in person is entitled to run. */
  myAgents: typeof AGENTS;
  /** Operator detail is collapsed for end users and open for platform owners. */
  detailDefaultOpen: boolean;
  toggleAutomation: (id: string) => void;
  saveAutomation: (automation: Automation, isNew: boolean) => void;
  saveRunbook: (
    id: string,
    body: string,
    includes: string[],
    defaults: Runbook["defaults"],
    note: string,
  ) => void;
  restoreRunbookVersion: (id: string, version: number) => void;
  /** True once the persisted state has been rehydrated on the client. */
  hydrated: boolean;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [driftMs, setDriftMs] = useState(0);

  // Rehydration is deliberately a second render pass. Reading sessionStorage
  // during the first render would make the client markup diverge from the
  // server's, so a mount effect is the correct place for it.
  useEffect(() => {
    dispatch({ type: "hydrate", state: load() });
  }, []);

  // The clock starts after mount for the same reason: an identical first frame.
  useEffect(() => {
    const t = setInterval(() => setDriftMs((d) => d + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  // Persisting to sessionStorage is an effect updating an external system,
  // which is what effects are for.
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, version: STATE_VERSION }),
      );
    } catch {
      /* storage unavailable; the demo still works, it just will not survive a reload */
    }
  }, [state]);

  const user = USERS.find((u) => u.id === state.currentUserId)!;

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      user,
      users: USERS,
      role: user.role,
      agents: AGENTS,
      reset: resetDemo,
      isAdmin: user.role === "platform",
      nowMs: DEMO_NOW.getTime() + driftMs,
      setUser: (id) => dispatch({ type: "set-user", userId: id }),
      decide: (intentId, decision, note, editedParameters) =>
        dispatch({
          type: "decide",
          intentId,
          decision,
          by: user.name,
          at: new Date(DEMO_NOW.getTime() + driftMs).toISOString(),
          note,
          editedParameters,
        }),
      pendingIntents: state.intents.filter((i) => i.state === "pending"),
      myIntents: scopedIntents(state.intents, user),
      myPendingIntents: scopedIntents(state.intents, user).filter((i) => i.state === "pending"),
      myQuestions: scopedQuestions(state.questions, user).filter((q) => q.state === "waiting"),
      myRuns: scopedRuns(state.runs, state.intents, user),
      myAgents: scopedAgents(AGENTS, user),
      detailDefaultOpen: user.role === "platform",
      toggleAutomation: (id) => dispatch({ type: "toggle-automation", id, by: user.name, at: stampAt(driftMs) }),
      saveAutomation: (automation, isNew) =>
        dispatch({ type: "save-automation", automation, isNew, by: user.name, at: stampAt(driftMs) }),
      saveRunbook: (id, body, includes, defaults, note) =>
        dispatch({ type: "save-runbook", id, body, includes, defaults, note, by: user.name, at: stampAt(driftMs) }),
      restoreRunbookVersion: (id, version) =>
        dispatch({ type: "restore-runbook", id, version, by: user.name, at: stampAt(driftMs) }),
    }),
    [state, user, driftMs],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
