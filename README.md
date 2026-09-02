# Esquire Agent Console — simplified build

Runs on **port 3101**. The earlier build, with the full detail exposed to every user, runs
unchanged on **port 3100** for comparison.

```bash
npm install
npm run dev      # http://localhost:3101
```

## What changed, and why

The first build showed everyone everything. A paralegal deciding whether a credit memo was
correct had to read past a payload hash, a tool name, a correlation id and an approver group to
reach the before-and-after. That is the right information for the person operating the platform
and the wrong information for the person doing the work.

Two changes follow from that.

**Detail is ranked, not deleted.** Every hash, tool name, policy rule and parameter still exists
and still prints — it is the evidence trail and removing it would gut the argument. It now sits
in a collapsed *Technical details* block below the decision, and it is open by default for
platform owners, because for them the detail is the job.

**Action items are addressed, not broadcast.** An approval belongs to a named group. Showing it
to everyone signed in invites exactly the rubber-stamping the approval step exists to prevent.
One rule, in `src/lib/scope.ts`, stated so a user could repeat it back: *you see the work you
started, and the work that is asking something of you.* Platform owners see everything.

The effect, on the same seeded data:

| Signed in as | Action items | Navigation |
|---|---|---|
| Marisol Reyes, Order Management | 1 | My work · Agents · History |
| Dana Carver, Revenue Operations | 2 | My work · Agents · History |
| Devin Marsh, Platform Engineer | 5 | My work · Agents · History · Admin |

## The end-user surface, in three screens

**My work** is the landing page and answers one question: what needs me. Two kinds of item
appear, and a person should not have to know which is which to find them — a *change waiting for
approval*, and a *question an agent could not answer* and stopped rather than guess.

**Agents** is what you can ask for. The operator view of this list — eval scores, tool counts,
package versions, runs per month — moved to Admin. What survives is what someone choosing an
agent needs: what it does, what it touches, and whether it can change anything without them.

**History** is the ledger with the plumbing taken off. No correlation ids, no payload hashes, no
`agent:` actor strings. The complete ledger is unchanged under Admin.

Runs, Activity and Governance moved wholesale under Admin. They were always operator views.

## The admin surface

Unchanged in substance — control room, agents and automations, runbooks, models, plus the three
views that moved in. The seven resulting tabs are grouped into **Operate** and **Configure**,
because operating the platform and configuring it are different jobs done at different times.

## What this demonstrates

The reference architecture makes one claim above all others: **models propose actions, they
never authorize themselves.** Everything else — the durable orchestrator, the immutable
ActionIntent, the deterministic policy gateway, the business ledger — exists to make that claim
enforceable and provable. This prototype is the surface where a person meets that machinery.

Five screens, each mapped to a named element of the architecture:

| Screen | Architecture element |
|---|---|
| **Agents** | Slide 1, "AI Agents" and role-based tool bundles. Catalog scoped by Okta group, with the highest write each agent may attempt. |
| **Agent workspace** | Slide 3, Interactive View. A person acting with their own permissions. Reads return inline, writes stop for confirmation, ungranted tools are refused outright. |
| **Approvals** | Slide 1/2, Command Center and Approval Inbox. The full action contract: exact tool and parameters, target record, before/after diff, risk tier, payload hash, expiry. |
| **Runs** | Slide 2, Step Functions Standard. Execution history with waits, retries, escalation and callback timeouts, written for a business user. |
| **Activity** | Slide 2, Business Ledger. Append-only intents, approvals, attempts and receipts, correlated end to end, exportable. |
| **Governance** | Slide 4, Production Guardrails and Pilot Exit Criteria, measured against the seeded environment. |
| **Admin** | Everything above plus agent configuration, for platform owners only. Interaction model adapted from Andrew Megli's Agent Ensemble prototype (Engineering Team Wiki, 19 Aug 2026). |

## The demo path

1. Open **Approvals**. Three actions are waiting, each with a live expiry countdown.
2. Open **AI-8841**, the $2,340 credit memo. Read the action contract. Note that the reasoning
   is backed by named evidence, and that the payload hash is shown before you decide.
3. Press **Edit payload** and change an amount. The hash warning appears: the payload no longer
   matches what the agent proposed, so approving records a new hash and a human-edited flag.
4. Approve it. Then open **Runs → run-4417**. The paused run has resumed, executed and
   read back. Open **Activity** and the approval, the attempt and the receipt are all there,
   sharing one correlation id.
5. Open **Agents → Deposition Scheduling Assistant** and use the suggested prompts. Turn two
   raises a write and stops for inline confirmation. Turn three asks for something outside the
   agent's tool bundle, and the gateway refuses rather than asking you to approve it.
6. Open **Runs → run-4409**. A run that hit a hard policy block, retried a flaky upload three
   times, and then escalated to a human instead of writing something partial.
7. Switch identity in the header. The catalog, the queue and the entitlements change.

## The admin path

Switch to **Devin Marsh, Platform Engineer** to reveal the Admin section. Two audiences, one
site: everything above answers "should this action happen?", everything here answers "what
should the agents be doing at all, and on what instructions?"

1. **Control room** opens as four collapsed rows — configured, running, waiting on a human,
   finished in 24 hours — each header carrying enough summary that opening one is a choice.
   Expand *Waiting on a human* to see agents that hit a decision they could not make, said so on
   the work item, named a person, and stopped.
2. **Configuration** is three concepts and nothing else: an agent, a runbook, and an automation
   pairing them with a trigger.
3. **New automation** asks three questions. Choose *When work items match a filter* and type a
   query. It is read back in plain English as you type. Break it — try
   `cf[10432] changed AFTER startOfDay(-3)` — and the builder names the part it cannot read and
   refuses to save, because a filter that quietly watches the wrong queue looks healthy while it
   does the wrong work.
4. **Runbooks → support-triage.** The dependency banner tells you what depends on this file
   before you type a character. Add a line saying `merge the change and close the ticket` and
   validation blocks the save: agents never merge their own work, and that guardrail is a check
   rather than a paragraph in a policy document. Tick *Show the composed prompt* to see the exact
   text the agent receives, snippets resolved.
5. Make a real edit and save it. The version bumps, the note is kept, and the change appears on
   the **Activity** ledger as a configuration change attributed to you — the same ledger as
   approvals and receipts, so one trail answers "why did the agent behave differently on
   Tuesday?"

**Reset demo** in the sub-header returns everything to the seeded starting position.

## Three outcomes, deliberately distinguished

The interface never blurs these, because the architecture does not:

- **Allowed.** The gateway cleared it against a deterministic rule. It executed, and a receipt
  proves it.
- **Approval required.** A named human in a named Okta group decides one specific payload. Not
  a standing permission: change the payload and the previous approval is void.
- **Blocked.** The tool is not in the agent's bundle, or a hard rule refuses it. There is no
  approve button, because there is nothing a user here can authorize. The fix is a change to
  the agent package.

## What is faked, and how

Everything external. There are no credentials in this repository and no network calls.

- **Agent responses** are scripted per agent in `src/lib/seed.ts` so a demo is deterministic.
  The shape of an exchange, a message plus the governed tool calls that produced it, is what a
  live session against the Agent SDK renders.
- **State** lives in a React reducer (`src/lib/store.tsx`), persisted to `sessionStorage` so a
  reload does not lose a walkthrough. In production this is the Business Ledger in PostgreSQL
  plus the Step Functions execution history.
- **Time** is anchored to a fixed demo clock (`DEMO_NOW`) so the server and client render an
  identical first frame and the countdowns stay believable. The clock ticks forward after mount.
- **No PHI, no client data.** Every firm, matter, job and person in the seed set is invented.

## Where the real integration goes

The store is the seam. Replacing `src/lib/store.tsx` with server actions that read the ledger
and post approval callbacks is the whole integration for the approval path, and it does not
touch a single screen. `src/lib/types.ts` is written as the contract those services would
satisfy.

The one design decision worth flagging: the approval callback must be **idempotent and bound to
the payload hash**, not to the intent id. Two approvers hitting Approve on the same intent, or
one approver double-clicking, has to resolve to exactly one write. The prototype models the
guard, it does not prove it under concurrency. That is a pilot exit criterion, not an interface
concern.

## Brand

Esquire palette and type, sourced from the live site: navy `#11213F`, sage `#709E83`, green
`#4B715B`, gold `#CDA132` (accent only), ink `#515151`, plus `#C75146` for blocking states.
Montserrat headings, Lato body, 3px gold focus ring. Dense tables over cards throughout: this is
a working tool for specialists, and information density is a feature.
