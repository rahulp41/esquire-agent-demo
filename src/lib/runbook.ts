import type { Automation, Runbook, Snippet, Trigger, TriggerType } from "./types";

/**
 * Variables an automation binds before a runbook is handed to an agent.
 * Anything else written as ${NAME} is flagged as unresolved.
 */
export const RUNBOOK_VARIABLES = [
  "WORK_ITEM",
  "WORK_ITEM_URL",
  "REPORTER",
  "JOB_NUMBER",
  "SYSTEM",
  "TODAY",
] as const;

/* ---------------------------------------------------------------- queries -- */

const FIELD_PHRASES: Record<string, string> = {
  project: "is in project",
  status: "has status",
  assignee: "is assigned to",
  reporter: "was raised by",
  labels: "is labelled",
  priority: "is priority",
  type: "is of type",
  omstatus: "has an order-management status of",
  jobstatus: "has a job status of",
  created: "was created",
  updated: "was updated",
};

function describeClause(clause: string): string | null {
  const t = clause.trim();
  if (!t) return null;

  const empty = t.match(/^(\w+)\s+is\s+(not\s+)?empty$/i);
  if (empty) {
    const field = empty[1].toLowerCase();
    const negated = Boolean(empty[2]);
    if (field === "assignee") return negated ? "is assigned to someone" : "is unassigned";
    return negated ? `has a ${field}` : `has no ${field}`;
  }

  const inList = t.match(/^(\w+)\s+(not\s+)?in\s*\((.*)\)$/i);
  if (inList) {
    const field = inList[1].toLowerCase();
    const negated = Boolean(inList[2]);
    const values = inList[3]
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    const list =
      values.length > 1
        ? `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`
        : values[0];
    const phrase = FIELD_PHRASES[field] ?? `has a ${field} of`;
    return negated ? `${phrase.replace(/^is /, "is not ")} ${list}` : `${phrase} ${list}`;
  }

  const rel = t.match(/^(\w+)\s*(>=|<=|!=|>|<|=|~)\s*(.+)$/);
  if (rel) {
    const field = rel[1].toLowerCase();
    const op = rel[2];
    const value = rel[3].trim().replace(/^["']|["']$/g, "");

    const rolling = value.match(/^-(\d+)([dhw])$/);
    if (rolling && (field === "created" || field === "updated")) {
      const n = rolling[1];
      const unit = { d: "day", h: "hour", w: "week" }[rolling[2]]!;
      const window = n === "1" ? unit : `${n} ${unit}s`;
      return `was ${field === "created" ? "created" : "updated"} in the last ${window}`;
    }

    const phrase = FIELD_PHRASES[field] ?? `has a ${field} of`;
    if (op === "!=") return `${phrase.replace(/^is /, "is not ").replace(/^has /, "does not have ")} ${value}`;
    if (op === "~") return `mentions ${value} in its text`;
    if (op === ">") return `${phrase} more than ${value}`;
    if (op === "<") return `${phrase} less than ${value}`;
    return `${phrase} ${value}`;
  }

  return null;
}

/**
 * Turn a filter query into the sentence an admin reads before saving.
 * Anything the parser cannot account for is reported honestly rather than
 * quietly dropped, because a silently misread filter is how an automation
 * ends up watching the wrong queue.
 */
export function describeQuery(query: string): {
  sentence: string;
  understood: boolean;
  unparsed: string[];
} {
  const clauses = query.split(/\s+AND\s+/i).filter((c) => c.trim());
  if (clauses.length === 0) {
    return { sentence: "No filter yet, so this automation would never start.", understood: false, unparsed: [] };
  }

  const parts: string[] = [];
  const unparsed: string[] = [];
  for (const c of clauses) {
    const d = describeClause(c);
    if (d) parts.push(d);
    else unparsed.push(c.trim());
  }

  if (parts.length === 0) {
    return { sentence: "None of this filter could be read back.", understood: false, unparsed };
  }

  const joined =
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}` : parts[0];

  return {
    sentence: `Runs when a work item ${joined}.`,
    understood: unparsed.length === 0,
    unparsed,
  };
}

/** One sentence describing any trigger, used on cards and in the builder. */
export function describeTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case "schedule": {
      const h = trigger.everyHours ?? 1;
      return `Runs every ${h} hour${h === 1 ? "" : "s"} on its own timer, whatever is or is not happening elsewhere.`;
    }
    case "filter":
      return describeQuery(trigger.query ?? "").sentence;
    case "mention":
      return `Runs when someone @mentions the agent on ${trigger.scope ?? "a work item"}.`;
    case "assignment":
      return `Runs when a work item in ${trigger.scope ?? "the queue"} is assigned to the agent.`;
  }
}

export const TRIGGER_LABELS: Record<TriggerType, { title: string; blurb: string }> = {
  schedule: {
    title: "On a schedule",
    blurb: "Every few hours, on its own timer. Nothing upstream has to happen.",
  },
  filter: {
    title: "When work items match a filter",
    blurb: "Watch a query and pick up whatever matches.",
  },
  mention: {
    title: "When mentioned in a comment",
    blurb: "Someone @mentions the agent on a work item.",
  },
  assignment: {
    title: "When a work item is assigned",
    blurb: "Someone assigns a work item to this agent.",
  },
};

/* ------------------------------------------------------------ validation -- */

export interface Finding {
  level: "error" | "warning";
  message: string;
  detail: string;
}

/**
 * Validation runs as you type. The rules are the platform guardrails expressed
 * as checks, not style preferences — an error here means the runbook would
 * break a stated rule if an agent ran it.
 */
export function validateRunbook(
  runbook: Pick<Runbook, "body" | "includes">,
  snippets: Snippet[],
  usedBy: Automation[],
): Finding[] {
  const findings: Finding[] = [];
  const body = runbook.body;

  if (body.trim().length < 120) {
    findings.push({
      level: "error",
      message: "The runbook is too thin to act on",
      detail:
        "An agent given a few lines will improvise the rest. State what it reads, what counts as done, and what to do when it cannot decide.",
    });
  }

  const known = new Set(snippets.map((s) => s.id));
  for (const id of runbook.includes) {
    if (!known.has(id)) {
      findings.push({
        level: "error",
        message: `Include "${id}" does not resolve`,
        detail: "The snippet was renamed or deleted. Compose would fail at the start of every run.",
      });
    }
  }

  // Guardrail: agents never merge, and never write without an approval path.
  const mergeLine = body
    .split("\n")
    .find((l) => /\bmerge\b/i.test(l) && !/draft|review|approval|never merge/i.test(l));
  if (mergeLine) {
    findings.push({
      level: "error",
      message: "This instructs the agent to merge its own work",
      detail: `Line reads: "${mergeLine.trim().slice(0, 90)}". Changes land as a draft behind human review. Rewrite it or the automation cannot be saved.`,
    });
  }

  const varsUsed = [...body.matchAll(/\$\{([A-Z_]+)\}/g)].map((m) => m[1]);
  for (const v of new Set(varsUsed)) {
    if (!RUNBOOK_VARIABLES.includes(v as (typeof RUNBOOK_VARIABLES)[number])) {
      findings.push({
        level: "warning",
        message: `\${${v}} is not a bound variable`,
        detail: "It will reach the agent as literal text. Use the insert-variable buttons above the editor.",
      });
    }
  }

  if (!/\bask\b|\bstop\b|\bescalate\b|\bhand (it |this )?(back|off)\b/i.test(body)) {
    findings.push({
      level: "warning",
      message: "No stopping condition",
      detail:
        "Nothing tells the agent what to do when it cannot decide. Without it, an agent guesses rather than asking a person.",
    });
  }

  if (usedBy.length === 0) {
    findings.push({
      level: "warning",
      message: "No automation uses this runbook",
      detail: "Edits here change nothing until an automation points at it.",
    });
  }

  return findings;
}

/* --------------------------------------------------------------- compose -- */

/**
 * The exact text an agent receives. Shown in the editor so nobody has to guess
 * what a change did — the composed prompt is the ground truth, not the body.
 */
export function composePrompt(
  runbook: Pick<Runbook, "name" | "body" | "includes" | "defaults">,
  snippets: Snippet[],
  context: { agentName: string; identity: string; systems: string[]; trigger: string },
): string {
  const byId = new Map(snippets.map((s) => [s.id, s]));
  const included = runbook.includes.map((id) => byId.get(id)).filter(Boolean) as Snippet[];

  const header = [
    `You are ${context.agentName}, running as the service identity ${context.identity}.`,
    `Everything you do is attributed to that identity, never to a person.`,
    ``,
    `Connected systems: ${context.systems.join(", ")}.`,
    `Every tool call is evaluated by the policy gateway before it reaches a system.`,
    `A call the gateway refuses is final. Do not route around it.`,
    ``,
    `Started because: ${context.trigger}`,
    `Model: ${runbook.defaults.model}. Wall-clock cap: ${runbook.defaults.wallClockCapMinutes} minutes. Retries: ${runbook.defaults.retryCap}.`,
    `Read scope: ${runbook.defaults.readScope}.`,
    `When you finish, the work item moves to: ${runbook.defaults.targetStatus}.`,
  ].join("\n");

  const snippetBlocks = included
    .filter((s) => !s.onDemand)
    .map((s) => `--- shared: ${s.name} ---\n${s.body}`)
    .join("\n\n");

  const onDemand = included.filter((s) => s.onDemand);
  const onDemandNote = onDemand.length
    ? `\n\n--- available on demand, read only if you need it ---\n${onDemand
        .map((s) => `${s.name}: ${s.summary}`)
        .join("\n")}`
    : "";

  return [
    `=== CONTEXT (assembled by the platform, not editable in the runbook) ===`,
    header,
    ``,
    `=== RUNBOOK: ${runbook.name} ===`,
    runbook.body,
    snippetBlocks ? `\n${snippetBlocks}` : "",
    onDemandNote,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Rough token estimate, good enough to catch a runbook that has ballooned. */
export function estimateTokens(text: string): number {
  return Math.round(text.length / 3.8);
}
