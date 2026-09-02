# Handoff — Esquire Agent Console

**From:** Jim Ballowe, CIO
**Date:** 28 Aug 2026
**Status:** Interface prototype. Not production code, not a starting branch. Read the "How to
treat this" section before you decide what to keep.

---

## What you are looking at

An interface prototype for how Esquire staff will interact with agents on the AI platform in
**Esquire AI Reference Architecture v11 (27 Aug 2026)**, which lives in Box at
`CIO/architecture/`. The deck is four slides; this repo turns the two that have a human in them
into something you can click.

It runs with `npm install && npm run dev` and needs no credentials, no database and no network
calls at runtime. Every firm, matter, job and person in it is invented. There is no PHI and no
client data anywhere in the repository, and there must not be.

Three documents, in the order worth reading them:

1. **`README.md`** — what each screen demonstrates, and the seven-step demo path. Start here.
2. **`ARCHITECTURE-MAP.md`** — every element of the deck crosswalked to where it appears, plus
   the four things deliberately left out and why. Read this before adding a screen.
3. **This file** — build, structure, and what to do next.

---

## Running it

Node 24 (`.nvmrc`). Anything from 20 up should work.

```bash
npm install
npm run dev        # http://localhost:3100
```

```bash
npm run build      # production build
npm run lint       # eslint, currently clean
npx tsc --noEmit   # typecheck, currently clean
```

`npm install` reaches Google Fonts once to self-host Montserrat and Lato via `next/font`. After
that the app makes no external requests. If your build environment blocks
`fonts.googleapis.com`, swap the `next/font/google` imports in `src/app/layout.tsx` for a
`next/font/local` declaration and commit the woff2 files.

There is no test suite. That is deliberate and it is also the first gap worth closing — see
below.

---

## Structure

```
src/
  app/
    page.tsx                 Agent catalog
    agents/[slug]/page.tsx   Agent workspace: the interactive chat surface
    approvals/               Approval inbox and the action contract detail page
    runs/                    Run list and the orchestrator timeline detail
    activity/page.tsx        Business ledger, filterable and CSV-exportable
    governance/page.tsx      Policy table, guardrails, pilot exit criteria
    admin/                   Platform-owner only: control room, config, runbooks, models
  components/
    AppShell.tsx             Nav, badge counts, identity switcher
    ActionContract.tsx       The flagship screen. Contract, diff, edit, decide
    Chat.tsx                 Interactive session and the inline write confirmation
    ToolCallCard.tsx         One governed tool call with its gateway verdict
    RunTimeline.tsx          Step Functions execution history for a business reader
    ui/Bits.tsx              Panel, Tag, Button, RiskPill, SystemChip and friends
    admin/AdminShell.tsx     Entitlement gate and admin sub-nav
    admin/Collapsible.tsx    The control-room row
  lib/
    types.ts                 The domain model. Read this first
    seed.ts                  All fixture data and the scripted agent conversations
    store.tsx                Client-side reducer standing in for the real backend
    format.ts                Time, duration and currency helpers
    runbook.ts               Filter-to-sentence, runbook validation, prompt composition
    admin-seed.ts            Runbooks, snippets, automations, models, control-room activity
```

Roughly 6,000 lines. `types.ts`, `store.tsx` and `runbook.ts` carry the design intent;
everything else is presentation.

`runbook.ts` is the one file here that is real logic rather than presentation, and the one most
worth reviewing on its own terms. It holds the filter parser that reads a query back in English,
the validator that blocks a runbook breaking a stated guardrail, and the prompt composer. All
three run on every keystroke in the editor.

---

## How to treat this

**Keep:** `src/lib/types.ts`. It is written as the contract the real services would satisfy, and
it is the most reviewed thing here. If you disagree with the shape of `ActionIntent`, that
disagreement is worth having now.

**Keep, with scrutiny:** the screens. They encode decisions about what a person must be shown
before authorizing a write. Change the visual design freely. Before removing a *field* from the
action contract, check `ARCHITECTURE-MAP.md` for which guardrail put it there.

**Throw away:** `src/lib/store.tsx` and `src/lib/seed.ts`. The store is a React reducer holding
state that belongs in the Business Ledger and the Step Functions execution history. It exists so
the prototype can demonstrate propagation — approve an intent and the paused run resumes, the
ledger gains three correlated rows, the badge count drops — without a backend.

**The store is the integration seam.** Replacing it with server actions that read the ledger and
post approval callbacks does not require touching a single screen component. That was the point
of putting all the mutation in one file.

---

## What is faked, precisely

| Faked | Real equivalent |
|---|---|
| `store.tsx` reducer + `sessionStorage` | Business Ledger (PostgreSQL) + Step Functions execution history |
| `CHAT_SCRIPTS` in `seed.ts` | A live session against the Claude Agent SDK on Bedrock |
| Tool-call verdicts baked into fixtures | MintMCP gateway evaluating the deterministic policy table at runtime |
| `DEMO_NOW` fixed clock | Wall-clock. The fixed clock keeps SSR and client markup identical and keeps countdowns believable in a demo |
| Identity switcher in the header | Okta SSO for employees; NetSuite native credentials for clients and partners |
| Deep links to NetSuite, Box, Jira | Real, and correctly formed. They will resolve for anyone with access |

---

## Known gaps, in the order I would fix them

1. **Approval callback idempotency.** This is the one that matters. The callback must be
   idempotent and bound to the **payload hash**, not the intent id. Two approvers pressing
   Approve on the same intent, or one approver double-clicking, has to resolve to exactly one
   write. The prototype models the guard in the UI; it does not prove it under concurrency.
   This belongs in the pilot exit criteria, not in the interface.
2. **No tests.** The state machine in `store.tsx` is the first thing that deserves one:
   approve, reject, approve-after-edit, and decide-on-an-expired-intent. Those four cases are
   the whole behavioural contract of the approval path.
3. **Expiry is cosmetic.** The countdown renders and the Approve button disables at zero, but
   nothing escalates. Real escalation is a Step Functions timeout, not a client-side timer.
4. **No optimistic-concurrency handling on the contract page.** If an intent settles in another
   tab, this one will not know. Fine for a prototype, wrong for production.
5. **Accessibility is good, not audited.** Semantic tables, labelled controls, `aria-current` on
   nav, and the 3px gold focus ring from the marketing site. It has not been through a screen
   reader or an automated audit. Esquire's front end is built WCAG 2.1 AA-minded and this should
   hold to that.
6. **`Chat.tsx` scripting is crude.** A turn counter over an array. It only needs to survive a
   demo; do not extend it, replace it when the SDK goes in.

---

## Conventions worth preserving

**Three outcomes, never blurred.** *Allowed* (a deterministic rule cleared it, a receipt proves
it), *Approval required* (a named human decides one specific payload), and *Blocked* (the tool
is not in the agent's bundle, so there is no approve button because there is nothing a user can
authorize — the fix is a change to the agent package). The interface distinguishes these
everywhere because the architecture does.

**An approval decides one payload, not a standing permission.** Editing a payload voids the
previous approval and records a new hash with the superseded one retained. See the
`editedFrom` field and the `rehash` function.

**Brand.** Palette and type come from the live esquiresolutions.com site: navy `#11213F`, sage
`#709E83`, green `#4B715B`, gold `#CDA132` (accent only, never a large fill), ink `#515151`,
plus `#C75146` for blocking states, which the marketing palette had no need for. Montserrat
headings, Lato body. Tokens are in `src/app/globals.css`.

**Density is a feature.** Tables over cards throughout. The users are paralegals, case managers
and retrieval specialists working a queue, not consumers.

---

## Getting it into GitLab

No git history is included — this arrived as an archive, and the first commit should be yours.

```bash
git init
git add .
git commit -m "Import Agent Console interface prototype"
git remote add origin <gitlab-url>
git push -u origin main
```

`.gitlab-ci.yml` runs install, typecheck, lint and build. It is deliberately minimal; there is
no deploy stage because there is nothing here that should be deployed anywhere public.

---

## Questions to bring back to me

- Does the `ActionIntent` shape survive contact with how you would actually model this?
- Is the approval inbox the right home for exceptions, or should approvals live inside the
  system of record where the work already is?
- What breaks first at 200 staff and a few thousand runs a day?

***ESQUIRE CONFIDENTIAL*** — For Internal Use Only

---

## Running the demo instance

The prototype is served as a **production build**, not a dev server, so it is fast and has no
dev overlay:

```bash
npm run build
npx next start -p 3100
```

To leave it running in the background with a log:

```bash
nohup npx next start -p 3100 > demo-server.log 2>&1 &
```

It listens on all interfaces, so anyone on the same network can reach it at
`http://<your-ip>:3100`. It is a plain Node process, not a service: it does not survive a
reboot, and there is no TLS, no auth in front of it and no process supervisor. That is fine for
a demo on a workstation and is not fine for anything else — if this needs to live somewhere
permanent, put it behind the normal deployment path rather than extending this.
