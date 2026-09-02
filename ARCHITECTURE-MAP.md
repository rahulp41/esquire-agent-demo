# Crosswalk: reference architecture v11 to this interface

Every element of the deck that has a user-facing consequence, and where it surfaces. Elements
with no user-facing consequence are listed too, with a note on why they are invisible by design.

## Slide 1 — High level

| Deck element | Where it appears |
|---|---|
| People, 200+ staff using AI daily | Header identity switcher; the catalog is scoped per person |
| AI Clients, Claude and ChatGPT via approved connectors | Not modeled. This console is a third surface alongside them, sharing the same gateway |
| AI Agents, scheduled or event-driven, least privilege | Catalog `trigger` column; tool bundle panel on each agent |
| Versioned Agent Package in Git | Agent version string (`v2.4.1`), canary badge, owner and team |
| Claude Agent SDK, Claude via Bedrock | Sub-header model line; agent workspace session banner |
| Runtime on AWS, ephemeral Fargate, per-task IAM | Run timeline "Plan" step; not otherwise surfaced, correctly — containment is invisible when it works |
| Evaluation, cross-cuts every layer | Eval score against the rollback gate, on the catalog and each agent |
| Command Center: action contract, diff, risk, expiry | **Approval detail page.** This is the flagship screen |
| Business Ledger (PostgreSQL): intents, approvals, receipts | **Activity page**, plus the per-run ledger panel |
| Durable Orchestration: waits, retries, timeout, escalation, resume | **Run timeline**, with paused, retried and escalated states shown distinctly |
| Agent Gateway + Deterministic Policy (MintMCP) | Verdict on every tool call card; the policy table on Governance |
| Systems of Record | System chips throughout; deep links to the actual record |
| Okta identity, actor plus workload | Okta group shown in the sub-header and on each action contract |
| Security, Sumo Logic, redacted | Noted on the Activity page footer |
| Analytics, usage, outcomes, cost | Cost and token columns on runs; spend tiles on the catalog and Governance |
| Knowledge and Retrieval, staged extension | Governance guardrail 6. Deliberately not built |

## Slide 2 — Production view

| Deck element | Where it appears |
|---|---|
| Intake with rate limits, backpressure, DLQ | Run timeline "Intake" step |
| Step Functions owns sequencing and history | Run timeline, labelled as such |
| SessionStore = conversation only | Chat pane holds no business state; every decision is written to the ledger |
| ActionIntent, payload hash, approval, attempt, receipt | The four ledger entry types, and the intent lifecycle |
| Outbox commits with the transaction, at-least-once relay | Governance guardrail 2 |
| S3 = evidence | Evidence key column on the Activity page |
| Server-rendered action contract: exact tool, params, diff, risk, expiry | Approval detail page, field for field |
| Changed payloads require new approval | Edit payload flow: warning banner, new hash, superseded hash recorded |
| Write path: idempotency → policy → approval → token exchange → execute → read-back → receipt | Run timeline steps, in that order |
| Correlated, redacted events | Correlation id on every run and ledger row |
| Agent packages: signed, canary, rollback | Canary badge; eval score against the rollback threshold |

## Slide 3 — Interactive view

| Deck element | Where it appears |
|---|---|
| Per-user identity, own permissions, never elevated | Chat session banner states it explicitly |
| Reads flow freely | Allowed tool calls render inline with results |
| Writes gated tool-by-tool by role | Approval-required cards, with the rule that produced the verdict |
| Inline confirmation for higher-risk actions, no async workflow | The gold confirmation block in the chat, distinct from the async Approval Inbox |
| Read-only safe tools on by default, write tools individually gated | Tool bundle panel marks each tool read or write |

## Slide 4 — Guardrails and exit criteria

The whole slide is the Governance page. The six guardrail families and the five exit criteria
are reproduced verbatim, with live counters from the seeded environment underneath: agents below
the eval gate, policy blocks, escalations, and the one that matters most, **write attempts
without a matching receipt**.

## Deliberate omissions

- **No agent authoring or package editing.** That is a Git and CI workflow, not an end-user one.
- **No prompt or model output display in the ledger.** Off by default per the telemetry guardrail.
- **No knowledge or retrieval surface.** Staged for later in the deck; showing it would overstate
  what exists.
- **No cost approval or budget request flow.** Budgets are enforced at the runtime, and a person
  hitting one should see an escalation, not a checkout screen.

---

# Admin surface — agent configuration

Added 29 Aug 2026. The end-user screens above answer "should this action happen?"
These answer "what should the agents be doing at all, and on what instructions?"

Source: **Agent Ensemble — AI agents working the Jira board (prototype)**, Andrew Megli,
Engineering Team Wiki (DPT), 19 Aug 2026. That prototype solved the configuration problem
convincingly, against real tickets, on one workstation. What is reproduced here is its
*interaction model*, not its visual design or its specific agents — the palette, typography and
density are this console's throughout, and the agents are Esquire's own.

Restricted to the platform-owner role. A non-admin does not see the nav item, and reaching an
`/admin` URL directly returns a Not entitled panel rather than a redirect, so the boundary is
legible rather than mysterious.

## The three concepts

The whole model, kept deliberately small:

| Concept | Here | Why it is separate |
|---|---|---|
| **Agent** | The service identity work is attributed to. Reuses the same records as the end-user catalog, so the two views cannot drift. | Comments, edits and receipts appear under its name, never a person's |
| **Runbook** | The instructions in plain English, plus the defaults nobody should have to think about | Editing behaviour is editing a paragraph, not shipping code |
| **Automation** | Pairs an agent with a runbook and decides what starts a run | The same runbook serves several triggers without duplication |

## Screen crosswalk

| Screen | What it reproduces |
|---|---|
| **Control room** (`/admin`) | Four panels, collapsed by default, so the page opens as four rows that already state the system's condition: what is configured, what is running, what is waiting on a human, what finished in 24 hours. Each header carries the summary, so opening a panel is a choice. |
| **Configuration** (`/admin/config`) | The three concepts as three card sections, plus a collapsed Infrastructure row. |
| **Automation builder** (`/admin/config/automations/[id]`) | Three numbered questions — pick an agent, pick a runbook, decide how it runs — with four trigger types, and everything else behind **Advanced options** with a working default inherited from the runbook. |
| **Runbook library** (`/admin/runbooks`) | Runbooks, shared snippets, and reference docs read on demand. Usage counts on every card, and an explicit "Not used" flag. |
| **Runbook editor** (`/admin/runbooks/[id]`) | Dependencies shown before you type, insert-variable and include toolbars, live validation, the exact composed prompt, and the last ten versions restorable. |
| **Models** (`/admin/models`) | Which model is cleared to drive which write tier, and what it takes to raise that ceiling. |

## What was built rather than mocked

Four behaviours are real logic in `src/lib/runbook.ts`, not fixtures, because they are the
parts an admin would otherwise have to take on trust:

1. **Filter to sentence.** `describeQuery` parses the filter and reads it back in English as you
   type. What it cannot parse it names, and an unparseable filter blocks saving — a filter that
   silently watches the wrong queue looks healthy while doing the wrong work.
2. **Runbook validation.** `validateRunbook` runs on every keystroke. Errors block the save.
   The rules are the platform guardrails expressed as checks, including one that rejects any
   instruction telling an agent to merge or self-approve its own work.
3. **Prompt composition.** `composePrompt` assembles the platform header, the runbook body and
   the resolved snippets into the exact text the agent receives, with a token estimate. There is
   no gap between what the editor shows and what runs.
4. **Version history.** Saving mints a version with an author and a note, capped at ten, and
   restoring mints another rather than rewriting history.

## Where the two halves join

Configuration changes are written to the **same ledger** as approvals, attempts and receipts,
as a `config-change` entry attributed to the person who made it. An auditor asking "why did the
agent behave differently on Tuesday?" reads one trail, not two, and the runbook version that
produced a given run is recoverable from it.

## Deliberate omissions

- **No runbook authoring from scratch in the UI.** New runbooks come from a copy or a skeleton
  in the source prototype; here the library is fixed and the editor is the demonstration. Adding
  a create flow is straightforward and adds nothing to the argument.
- **No live agent execution.** The control room reads seeded runs. Wiring it to real
  orchestration is the same integration as the end-user side.
- **No snippet editor.** Snippets are shown, counted and composed, but edited only in the
  runbook that includes them. A shared-text editor is the same interaction twice.
