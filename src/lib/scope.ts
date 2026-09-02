import type {
  ActionIntent,
  Agent,
  AgentQuestion,
  EnsembleRun,
  LedgerEntry,
  Run,
  User,
} from "./types";

/**
 * Who sees what.
 *
 * One rule, stated so a user could repeat it back: **you see the work you
 * started, and the work that is asking something of you.** Platform owners see
 * everything, because operating the platform means seeing all of it.
 *
 * This is not cosmetic filtering. An approval is addressed to a named group; a
 * person outside that group has no business deciding it, and showing it to them
 * invites exactly the rubber-stamping the approval step exists to prevent.
 */

export const isAdmin = (user: User) => user.role === "platform";

/**
 * Agents this person may run. Being entitled to ask an agent to look at
 * something is a separate permission from being entitled to approve what it
 * proposes, which is why this reads a different group than the approver group
 * on an intent.
 */
export function scopedAgents(agents: Agent[], user: User): Agent[] {
  if (isAdmin(user)) return agents;
  return agents.filter((a) => a.entitledGroups.some((g) => user.groups.includes(g)));
}

export function canRunAgent(agent: Agent, user: User): boolean {
  return isAdmin(user) || agent.entitledGroups.some((g) => user.groups.includes(g));
}

/** Approvals addressed to a group this person belongs to. */
export function scopedIntents(intents: ActionIntent[], user: User): ActionIntent[] {
  if (isAdmin(user)) return intents;
  return intents.filter(
    (i) => user.groups.includes(i.approverGroup) || i.decidedBy === user.name,
  );
}

/** Questions an agent addressed to this person by name. */
export function scopedQuestions(questions: AgentQuestion[], user: User): AgentQuestion[] {
  if (isAdmin(user)) return questions;
  return questions.filter((q) => q.mentioned === user.name);
}

/** Work this person started, or that produced something addressed to them. */
export function scopedRuns(runs: Run[], intents: ActionIntent[], user: User): Run[] {
  if (isAdmin(user)) return runs;
  const mine = new Set(
    scopedIntents(intents, user).map((i) => i.runId),
  );
  return runs.filter((r) => r.startedBy === user.name || mine.has(r.id));
}

export function scopedEnsembleRuns(runs: EnsembleRun[], user: User): EnsembleRun[] {
  if (isAdmin(user)) return runs;
  return [];
}

/**
 * Ledger rows belonging to work this person can see. Configuration changes are
 * platform business and never appear on an end user's history.
 */
export function scopedLedger(
  ledger: LedgerEntry[],
  visibleRunIds: Set<string>,
  user: User,
): LedgerEntry[] {
  if (isAdmin(user)) return ledger;
  return ledger.filter((l) => l.kind !== "config-change" && visibleRunIds.has(l.runId));
}
