import type {
  AgentQuestion,
  Automation,
  EnsembleRun,
  ModelEntry,
  Runbook,
  Snippet,
} from "./types";

/* ------------------------------------------------------------- snippets -- */

export const SNIPPETS: Snippet[] = [
  {
    id: "writing-to-a-record",
    name: "writing-to-a-record",
    summary: "How to phrase a change before proposing it, and what must be in the intent.",
    body: `Before you propose any write, state it as one sentence a non-engineer could check.

Include, without exception:
- the exact tool and every parameter, with nothing implied or filled in later
- the record you are touching, by id, with a link
- the current value of every field you would change, read fresh, not remembered
- what you concluded and the specific evidence you concluded it from

If you cannot state the current value of a field, you have not read it. Read it.
Never propose a write whose effect you cannot describe in a single sentence.`,
  },
  {
    id: "asking-a-person",
    name: "asking-a-person",
    summary: "How to stop and hand a decision to a named human rather than guessing.",
    body: `When the evidence does not settle the question, stop.

Do not pick the likelier option. Do not proceed with a caveat. Post one comment
that says what you found, what you cannot determine, and the specific question
you need answered. @mention the person who raised the work item, or the queue
owner if there is no reporter.

Then exit. The run ends here. If someone answers and @mentions you back, you
will be started again as a revision run with the full thread in context.

A question that stops a run is a good outcome. A guess that reaches a system of
record is not.`,
  },
  {
    id: "netsuite-tooling",
    name: "netsuite-tooling",
    summary: "Which NetSuite tool to reach for, and the identifier conventions.",
    body: `Prefer SuiteQL through query_records for anything you can express as a query.
It is faster than loading records and it survives sparse edits.

Use load_record only when you need field values that a query cannot return.

Job numbers are the letter J followed by the record's internal id. J14964046 is
internal id 14964046. Confirm before acting:
  SELECT id, entityid FROM job WHERE entityid = 'J<number>'

Job Status is custentity_jobproductionstatus. Order Management Status is
custentity_esquire_om_status. They are different fields and they disagree more
often than anyone expects. Read both.`,
  },
  {
    id: "house-voice",
    name: "house-voice",
    summary: "How anything customer-visible should read.",
    body: `Anything a client or a reporter will read: plain sentences, no jargon, no
apologising twice. Say what happened, what it means for them, and what happens
next. Name the person who will do the next thing.

No em dashes. Do not join two independent clauses with a comma.

If you are writing to someone outside Esquire, that text leaves the tenant the
moment it is approved. Write it as though it will be read aloud in a deposition,
because it might be.`,
  },
  {
    id: "job-status-reference",
    name: "job-status-reference",
    summary: "Full status code tables for jobs, order management and worksheets.",
    onDemand: true,
    body: `Job Status (custentity_jobproductionstatus)
  1 Requested   2 Scheduled   3 Client Confirmed   4 Esquire Confirmed
  5 Taken       6 Turned In   7 Production         8 Prod Complete
  9 Complete   10 Draft      11 Cancelled         12 Postponed
 13 Produced in Solaria     14 Processing Turn In

Order Management Status (custentity_esquire_om_status)
  1 Unassigned  2 Validating  3 Validated  4 Ordering  5 Complete
  Flow: Unassigned to Validating to Validated to Ordering to Complete.

Worksheet production status (custrecord_ws_prod_status)
  1 N/A  2 Pre-production  3 Unassigned  4 Assigned  5 Rejected Transcript
  6 Resubmitted By CR  7 Returned From CR  8 Processing  9 Produced  10 Completed

Worksheet types: 2 = CR (transcript), 3 = VID (video), 4 = INT (interpreter).

A worksheet at 9 - Produced should always have a transcriptionist submission
timestamp and a delivery artifact. Produced with neither is not a valid state.`,
  },
];

/* ------------------------------------------------------------- runbooks -- */

const RECONCILER_BODY = `Find transcripts that are marked produced but were never delivered, and correct
only the ones where the records are unambiguous.

## What you are looking for

A transcript worksheet at status 9 - Produced with no delivery artifact on the
job. A genuinely produced transcript leaves two traces: a transcriptionist
submission timestamp, and a delivery file. If both are missing, the worksheet
moved to Produced without anything behind it.

## How to work

1. Query for worksheets at Produced. Do not load records you do not need.
2. For each, read the submission timestamp fresh.
3. Search the delivery store for a matching artifact. Search every naming
   convention you know, not just the current one.
4. Propose moving the worksheet back to 8 - Processing only where the
   submission timestamp is empty AND no artifact exists. One field, nothing else.

## What counts as done

Every worksheet matching the pattern has either a proposed correction with
evidence, or a note saying why it did not qualify. A run that changes nothing
and explains why is a successful run.

## When you cannot decide

If the submission timestamp is populated but you cannot find an artifact, the
two signals disagree and you do not know which is wrong. Do not propose a
change. Say what you found, name the job, and stop. A delivered transcript
pushed back into the queue is worse than one left alone.

Work item: \${WORK_ITEM}. Today is \${TODAY}.`;

const INVOICE_BODY = `Reconcile a disputed invoice against what was actually delivered, and draft a
credit memo when the two do not match.

## How to work

1. Read the invoice header and every line.
2. Read the job the invoice was raised from. Read its service instances, not the
   job-level fields, which are synced copies and drift.
3. Read the worksheets on the job. A billed videography line with no VID
   worksheet and no Videography service instance was not delivered.
4. For each line that was billed but not delivered, establish why. A scope
   reduction the client requested is a different finding from a data error, and
   the credit memo memo field should say which.

## What counts as done

A credit memo proposed for exactly the undelivered lines, with the job number in
the memo field, and every line traced to a named piece of evidence.

## When you cannot decide

If a line is ambiguous, credit only the lines you are certain of and ask about
the rest. Never round a credit up to make a total look tidy.

Work item: \${WORK_ITEM}. Raised by \${REPORTER}.`;

const TRIAGE_BODY = `Read a new support ticket, work out what it actually is, and leave the next
person better off than you found them.

## How to work

1. Read the ticket and every linked ticket.
2. Search the last 90 days for the same symptom. Match on behaviour, not on
   wording, since two people describe the same crash differently.
3. If a job number is mentioned, look it up and state its real status rather
   than repeating what the reporter believes it is.
4. Set the component and priority. Link duplicates.
5. Draft the reply. Do not post it as a public comment yourself.

## What counts as done

The ticket is classified, duplicates are linked, and there is a draft reply that
a support engineer can send with light editing.

## When you cannot decide

If you cannot tell which system a ticket belongs to after reading it, say what
you ruled out and ask. Guessing the component sends the ticket to the wrong
queue and costs a day.

Work item: \${WORK_ITEM}. Reporter: \${REPORTER}.`;

const AUDIT_BODY = `Check that every produced transcript reached the ordering firm inside the
committed turnaround, and report the ones that did not.

You are read-only. You propose nothing and you change nothing. Your entire
output is the report.

## How to work

1. List transcripts produced in the trailing seven days.
2. For each, find the delivery artifact and compare its timestamp against the
   committed turnaround on the job.
3. Group the misses. One vendor slipping is a different problem from nine
   unrelated one-offs, and the grouping is the useful part of the report.

## What counts as done

A count, a rate against tolerance, and the grouped explanation. If the rate is
inside tolerance, say so plainly rather than padding the report.

Today is \${TODAY}.`;

export const RUNBOOKS: Runbook[] = [
  {
    id: "delivery-record-reconciler",
    name: "delivery-record-reconciler",
    summary:
      "Corrects transcript worksheets marked produced with nothing delivered behind them, one field at a time, with evidence.",
    owner: "Marisol Reyes",
    body: RECONCILER_BODY,
    includes: ["writing-to-a-record", "netsuite-tooling", "asking-a-person", "job-status-reference"],
    defaults: {
      model: "claude-sonnet-5",
      readScope: "NetSuite, read-only outside the proposed write",
      targetStatus: "Leave the work item where it is",
      wallClockCapMinutes: 15,
      retryCap: 2,
    },
    updatedAt: "2026-08-27T09:14:00-04:00",
    versions: [
      {
        version: 7,
        at: "2026-08-27T09:14:00-04:00",
        author: "Marisol Reyes",
        note: "Search every delivery naming convention, not just the current one. One good transcript was nearly pushed back into the queue.",
        body: RECONCILER_BODY,
      },
      {
        version: 6,
        at: "2026-08-21T16:02:00-04:00",
        author: "Marisol Reyes",
        note: "Require both signals to be missing before proposing. One was producing false positives.",
        body: RECONCILER_BODY.replace(
          "Search every naming\n   convention you know, not just the current one.",
          "",
        ),
      },
      {
        version: 5,
        at: "2026-08-12T11:40:00-04:00",
        author: "Devin Marsh",
        note: "Pulled the status tables out into a shared on-demand reference.",
        body: RECONCILER_BODY.replace("## When you cannot decide", "## Edge cases"),
      },
    ],
  },
  {
    id: "invoice-reconciliation",
    name: "invoice-reconciliation",
    summary:
      "Traces a disputed invoice back to delivered services and drafts a credit memo for the lines that were billed but never performed.",
    owner: "Dana Carver",
    body: INVOICE_BODY,
    includes: ["writing-to-a-record", "netsuite-tooling", "asking-a-person", "house-voice"],
    defaults: {
      model: "claude-opus-5",
      readScope: "NetSuite and Microsoft 365, read-only outside the proposed write",
      targetStatus: "Awaiting finance approval",
      wallClockCapMinutes: 25,
      retryCap: 2,
    },
    updatedAt: "2026-08-26T14:30:00-04:00",
    versions: [
      {
        version: 4,
        at: "2026-08-26T14:30:00-04:00",
        author: "Dana Carver",
        note: "Read service instances, never the synced job fields. Two bad credits came from the old fields.",
        body: INVOICE_BODY,
      },
      {
        version: 3,
        at: "2026-08-14T10:05:00-04:00",
        author: "Dana Carver",
        note: "Require the job number in the memo field.",
        body: INVOICE_BODY.replace(", with the job number in\nthe memo field,", ","),
      },
    ],
  },
  {
    id: "support-triage",
    name: "support-triage",
    summary:
      "Classifies a new support ticket, links duplicates, checks any job number against NetSuite, and drafts a reply for a person to send.",
    owner: "Nate Oduya",
    body: TRIAGE_BODY,
    includes: ["asking-a-person", "netsuite-tooling", "house-voice", "job-status-reference"],
    defaults: {
      model: "claude-sonnet-5",
      readScope: "Atlassian and NetSuite, read-only",
      targetStatus: "Triaged",
      wallClockCapMinutes: 10,
      retryCap: 3,
    },
    updatedAt: "2026-08-28T07:55:00-04:00",
    versions: [
      {
        version: 12,
        at: "2026-08-28T07:55:00-04:00",
        author: "Nate Oduya",
        note: "Match on behaviour rather than wording when searching for duplicates.",
        body: TRIAGE_BODY,
      },
      {
        version: 11,
        at: "2026-08-25T13:22:00-04:00",
        author: "Nate Oduya",
        note: "Stop posting public replies directly. Draft only.",
        body: TRIAGE_BODY.replace(
          "5. Draft the reply. Do not post it as a public comment yourself.",
          "5. Post the reply as a public comment.",
        ),
      },
    ],
  },
  {
    id: "delivery-audit",
    name: "delivery-audit",
    summary:
      "Read-only sweep confirming produced transcripts reached the ordering firm inside the committed turnaround.",
    owner: "Marisol Reyes",
    body: AUDIT_BODY,
    includes: ["netsuite-tooling"],
    defaults: {
      model: "claude-haiku-4-5",
      readScope: "NetSuite and Box, read-only",
      targetStatus: "Leave the work item where it is",
      wallClockCapMinutes: 30,
      retryCap: 1,
    },
    updatedAt: "2026-08-19T08:00:00-04:00",
    versions: [
      {
        version: 3,
        at: "2026-08-19T08:00:00-04:00",
        author: "Marisol Reyes",
        note: "Group misses by vendor. Ungrouped lists were being ignored.",
        body: AUDIT_BODY,
      },
    ],
  },
];

/* ---------------------------------------------------------- automations -- */

export const AUTOMATIONS: Automation[] = [
  {
    id: "auto-delivery-sweep",
    name: "delivery-record-sweep",
    agentSlug: "transcript-production-reconciler",
    runbookId: "delivery-record-reconciler",
    trigger: { type: "schedule", everyHours: 24 },
    enabled: true,
    owner: "Marisol Reyes",
    concurrency: 1,
    lastPollAt: "2026-08-28T06:00:00-04:00",
    runsLast24h: 1,
    overrides: {},
  },
  {
    id: "auto-invoice-dispute",
    name: "invoice-dispute-intake",
    agentSlug: "invoice-exception-handler",
    runbookId: "invoice-reconciliation",
    trigger: {
      type: "filter",
      query: "system = NetSuite AND type = Invoice AND status = Disputed AND created > -7d",
    },
    enabled: true,
    owner: "Dana Carver",
    concurrency: 2,
    lastPollAt: "2026-08-28T14:10:00-04:00",
    runsLast24h: 3,
    overrides: { wallClockCapMinutes: 30 },
  },
  {
    id: "auto-it-triage",
    name: "it-intake-triage",
    agentSlug: "it-intake-triage",
    runbookId: "support-triage",
    trigger: {
      type: "filter",
      query: 'project = IT AND status = Open AND assignee IS EMPTY AND created > -1d',
    },
    enabled: true,
    owner: "Nate Oduya",
    concurrency: 4,
    lastPollAt: "2026-08-28T14:11:30-04:00",
    runsLast24h: 14,
    overrides: {},
  },
  {
    id: "auto-it-revision",
    name: "it-triage-revisions",
    agentSlug: "it-intake-triage",
    runbookId: "support-triage",
    trigger: { type: "mention", scope: "project IT" },
    enabled: true,
    owner: "Nate Oduya",
    concurrency: 2,
    lastPollAt: "2026-08-28T14:11:30-04:00",
    runsLast24h: 2,
    overrides: { retryCap: 1 },
  },
  {
    id: "auto-delivery-audit",
    name: "daily-delivery-audit",
    agentSlug: "transcript-delivery-auditor",
    runbookId: "delivery-audit",
    trigger: { type: "schedule", everyHours: 24 },
    enabled: true,
    owner: "Marisol Reyes",
    concurrency: 1,
    lastPollAt: "2026-08-28T07:30:00-04:00",
    runsLast24h: 1,
    overrides: {},
  },
  {
    id: "auto-scheduling-assign",
    name: "scheduling-assignment",
    agentSlug: "deposition-scheduling-assistant",
    runbookId: "delivery-record-reconciler",
    trigger: { type: "assignment", scope: "the scheduling queue" },
    enabled: false,
    owner: "Priya Raman",
    concurrency: 2,
    runsLast24h: 0,
    overrides: {},
  },
];

/* ------------------------------------------------------------- questions -- */

export const QUESTIONS: AgentQuestion[] = [
  {
    id: "q-4479",
    automationId: "auto-delivery-sweep",
    agentSlug: "transcript-production-reconciler",
    workItem: "J15042118",
    workItemUrl: "https://3756790.app.netsuite.com/app/accounting/project/project.nl?id=14642103",
    askedAt: "2026-08-28T10:26:00-04:00",
    question:
      "The worksheet here is marked Produced and the submission timestamp is populated, but I cannot find a delivery file under any naming convention I know. Either it was filed somewhere I am not looking or it was never sent. I have not changed anything, because pushing a delivered transcript back into the queue is worse than leaving it.",
    mentioned: "Marisol Reyes",
    state: "waiting",
  },
  {
    id: "q-4477",
    automationId: "auto-delivery-sweep",
    agentSlug: "transcript-production-reconciler",
    workItem: "J15038660",
    workItemUrl: "https://3756790.app.netsuite.com/app/accounting/project/project.nl?id=14642103",
    askedAt: "2026-08-28T07:58:00-04:00",
    question:
      "The transcript worksheet says Produced but there is no delivery record and the ordering firm emailed yesterday asking where it is. Either the worksheet was marked produced early or the delivery failed silently. I cannot tell which from the records, and the two have different fixes.",
    mentioned: "Marisol Reyes",
    state: "waiting",
  },
  {
    id: "q-4476",
    automationId: "auto-invoice-dispute",
    agentSlug: "invoice-exception-handler",
    workItem: "INV-118219",
    workItemUrl: "https://3756790.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=73981160&whence=",
    askedAt: "2026-08-28T08:33:00-04:00",
    question:
      "The rate card has two entries for realtime reporting in this market, $4.15 and $4.60 per page, both marked current with no effective dates. The invoice used $4.60. On 312 pages the difference is $140.40. I will not guess which rate is right.",
    mentioned: "Dana Carver",
    state: "waiting",
  },
  {
    id: "q-4471",
    automationId: "auto-it-triage",
    agentSlug: "it-intake-triage",
    workItem: "IT-121618",
    workItemUrl: "https://esquire.atlassian.net/browse/IT-121618",
    askedAt: "2026-08-28T11:04:00-04:00",
    question:
      "The ticket says the export failed but names two different job numbers, J15048812 and J15048182, and only the second exists. Which job did you mean? I have not touched either.",
    mentioned: "Joseph Allen",
    state: "waiting",
  },
  {
    id: "q-4468",
    automationId: "auto-invoice-dispute",
    agentSlug: "invoice-exception-handler",
    workItem: "INV3458721",
    workItemUrl: "https://3756790.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=73960547&whence=",
    askedAt: "2026-08-28T09:41:00-04:00",
    question:
      "Two interpreter lines were billed and one interpreter service instance exists. That is either a duplicate billing line or a second interpreter nobody recorded. Crediting the wrong one is a $690 error, so I have stopped.",
    mentioned: "Dana Carver",
    state: "waiting",
  },
  {
    id: "q-4455",
    automationId: "auto-it-triage",
    agentSlug: "it-intake-triage",
    workItem: "IT-121604",
    workItemUrl: "https://esquire.atlassian.net/browse/IT-121604",
    askedAt: "2026-08-27T15:12:00-04:00",
    question:
      "Cannot tell whether this belongs to the Outlook add-in or the portal upload path. Both produce this error text.",
    mentioned: "Nate Oduya",
    state: "answered",
  },
];

/* ---------------------------------------------------------------- runs -- */

const r = (
  id: string,
  automationId: string,
  agentSlug: string,
  workItem: string,
  title: string,
  startedAt: string,
  state: EnsembleRun["state"],
  extra: Partial<EnsembleRun> = {},
): EnsembleRun => ({
  id,
  automationId,
  agentSlug,
  workItem,
  workItemUrl: workItem.startsWith("IT-")
    ? `https://esquire.atlassian.net/browse/${workItem}`
    : "https://3756790.app.netsuite.com/",
  title,
  startedAt,
  turns: 8,
  state,
  costUsd: 0.04,
  sandbox: `sbx-${id.slice(-6)}`,
  ...extra,
});

export const ENSEMBLE_RUNS: EnsembleRun[] = [
  r("er-5512", "auto-it-triage", "it-intake-triage", "IT-121611", "Outlook add-in crash on transcript upload", "2026-08-28T13:58:47-04:00", "running", { turns: 6, costUsd: 0.03 }),
  r("er-5511", "auto-invoice-dispute", "invoice-exception-handler", "INV-118204", "Harrington & Boyle dispute", "2026-08-28T13:46:02-04:00", "waiting", { turns: 14, costUsd: 0.42, outcome: "change-proposed", note: "Paused on approval AI-8841." }),
  r("er-5510", "auto-it-triage", "it-intake-triage", "IT-121618", "Export failure, ambiguous job number", "2026-08-28T11:02:10-04:00", "waiting", { turns: 9, costUsd: 0.05, outcome: "asked-a-question", durationMs: 118_000 }),
  r("er-5509", "auto-it-triage", "it-intake-triage", "IT-121609", "Reporter cannot see turned-in transcript", "2026-08-28T10:31:00-04:00", "done", { turns: 11, costUsd: 0.06, outcome: "diagnosis", durationMs: 214_000 }),
  r("er-5508", "auto-invoice-dispute", "invoice-exception-handler", "INV3458721", "Duplicate interpreter line", "2026-08-28T09:38:00-04:00", "waiting", { turns: 12, costUsd: 0.31, outcome: "asked-a-question", durationMs: 186_000 }),
  r("er-5507", "auto-it-triage", "it-intake-triage", "IT-121607", "Password reset loop on the client portal", "2026-08-28T09:12:00-04:00", "done", { turns: 5, costUsd: 0.02, outcome: "diagnosis", durationMs: 96_000 }),
  r("er-5506", "auto-delivery-audit", "transcript-delivery-auditor", "AUDIT-0828", "Daily turnaround audit", "2026-08-28T07:30:00-04:00", "done", { turns: 22, costUsd: 0.88, outcome: "diagnosis", durationMs: 210_000 }),
  r("er-5505", "auto-delivery-sweep", "transcript-production-reconciler", "SWEEP-0828", "Delivery record sweep", "2026-08-28T06:00:00-04:00", "done", { turns: 18, costUsd: 0.61, outcome: "change-proposed", durationMs: 253_000 }),
  r("er-5504", "auto-it-triage", "it-intake-triage", "IT-121602", "GFV button missing on J14984429", "2026-08-27T16:39:00-04:00", "done", { turns: 10, costUsd: 0.05, outcome: "diagnosis", durationMs: 141_000 }),
  r("er-5503", "auto-it-revision", "it-intake-triage", "IT-121598", "Revision run after reviewer comment", "2026-08-27T15:50:00-04:00", "done", { turns: 7, costUsd: 0.04, outcome: "diagnosis", durationMs: 88_000 }),
  r("er-5502", "auto-it-triage", "it-intake-triage", "IT-121596", "Duplicate of IT-121544", "2026-08-27T14:20:00-04:00", "done", { turns: 4, costUsd: 0.02, outcome: "no-action", durationMs: 51_000, note: "Closed as duplicate. No change proposed." }),
  r("er-5501", "auto-invoice-dispute", "invoice-exception-handler", "INV-118188", "Rate card mismatch", "2026-08-27T11:05:00-04:00", "failed", { turns: 3, costUsd: 0.09, outcome: "failed", durationMs: 41_000, note: "Wall-clock cap reached mid-read. Retried twice, then stopped without proposing." }),
];

/* -------------------------------------------------------------- models -- */

export const MODELS: ModelEntry[] = [
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    servedVia: "Bedrock, us-east-1",
    approvedUpTo: "high",
    contextWindow: "500k",
    inputPer1M: 5,
    outputPer1M: 25,
    status: "approved",
    note: "Default for anything that proposes a financial write or reads across more than one system.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    servedVia: "Bedrock, us-east-1",
    approvedUpTo: "medium",
    contextWindow: "300k",
    inputPer1M: 3,
    outputPer1M: 15,
    status: "approved",
    note: "The workhorse. Cleared for status corrections and triage, not for financial writes.",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    servedVia: "Bedrock, us-east-1",
    approvedUpTo: "read-only",
    contextWindow: "200k",
    inputPer1M: 1,
    outputPer1M: 5,
    status: "approved",
    note: "Read-only sweeps and audits. Not cleared to drive any write, at any tier.",
  },
  {
    id: "claude-opus-5-thinking",
    label: "Claude Opus 5, extended thinking",
    servedVia: "Bedrock, us-east-1",
    approvedUpTo: "read-only",
    contextWindow: "500k",
    inputPer1M: 5,
    outputPer1M: 25,
    status: "evaluating",
    note: "In evaluation for the invoice reconciliation path. Held at read-only until the eval suite clears 0.95.",
  },
  {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    servedVia: "Bedrock, us-east-1",
    approvedUpTo: "read-only",
    contextWindow: "200k",
    inputPer1M: 3,
    outputPer1M: 15,
    status: "retired",
    note: "Superseded by Sonnet 5 on 14 Aug. Kept listed so historical runs still resolve their model.",
  },
];
