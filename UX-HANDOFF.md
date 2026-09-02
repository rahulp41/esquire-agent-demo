# Agent Console — orientation for visual work

**What this is:** a working prototype of Esquire's AI agent console. Two audiences in one app —
staff who respond to agents, and platform owners who configure them.

**What you're being asked to do:** make it look good. The structure, the copy and the
role-scoping logic are settled; the visual design is not.

---

## Run it

Node 20 or newer. Two commands, no database, no credentials, no network calls at runtime.

```bash
npm install
npm run dev        # http://localhost:3101
```

Hot reload is on. Save a file, the browser updates.

```bash
npm run lint       # currently clean, please keep it that way
npx tsc --noEmit   # currently clean
npm run build      # production build
```

## See the whole thing in two minutes

Use the identity switcher in the top right. It changes what the app shows, which is the point.

- **Marisol Reyes** — a specialist. Three nav items, five things needing her, three agents.
- **Dana Carver** — an approver. Same shape, different queue.
- **Devin Marsh** — platform owner. Gains the whole Admin section: control room, configuration,
  runbooks, models, runs, activity, governance.

**Reset demo**, in the strip under the header, puts everything back. Approving something changes
real state in the browser, so use it freely.

Screens worth looking at, roughly in order of how much they matter:

1. `/` as Dana — the decision cards
2. `/approvals/AI-8844` — the decision screen, the most important page in the app
3. `/agents/transcript-production-reconciler` as Marisol — the conversation surface
4. `/admin` as Devin — four collapsed rows
5. `/admin/runbooks/delivery-record-reconciler` as Devin — the densest screen

---

## Where the design lives

```
src/app/globals.css        Brand tokens and the table style. Start here.
src/components/ui/Bits.tsx Panel, Tag, Button, RiskPill, SystemChip, Confidence, Detail, Field
src/components/            The bigger pieces: ActionContract, Chat, AppShell, ToolCallCard
src/app/**/page.tsx        Screens. Layout lives here, not in a stylesheet.
```

Tailwind v4. There is no `tailwind.config.js` — the theme is the `@theme` block at the top of
`globals.css`. Change a colour there and it changes everywhere.

### The brand values are not negotiable, the rest is

These come from the live esquiresolutions.com site and should survive whatever you do:

```
--color-navy       #11213F   primary
--color-sage       #709E83   light accent
--color-brandgreen #4B715B   accessible on white
--color-gold       #CDA132   accent only, never a large fill
--color-ink        #515151   body text
--color-danger     #C75146   blocking states
```

Montserrat for headings, Lato for body, both self-hosted through `next/font`. The focus ring is
`3px solid var(--color-gold)` and the app was built WCAG 2.1 AA-minded — please keep both.

Gold earns its keep by being rare. It currently means "a person needs to act": approval badges,
pending states, the waiting panel. If it starts appearing as decoration it stops carrying that.

---

## The one thing that will annoy you

Type sizes and radii are **arbitrary Tailwind values scattered across call sites**, not a scale:
294 instances of `text-[12.5px]` and friends across 17 distinct sizes, and 52 radii across 5.
Changing the type scale globally today means touching 294 places.

I deliberately did not normalise these into tokens before handing over, because choosing the
scale is your call, not mine. Two ways forward:

- Tell me the scale you want and I will do the mechanical pass, so you start from tokens.
- Or set the tokens yourself in `globals.css` and I will migrate the call sites after.

Either is quick. Doing it before you start will save you the most time.

---

## Please don't break these

Not style rules — they are the argument the prototype exists to make.

**Density is deliberate.** These are queue-working tools for paralegals and case managers, not a
consumer app. Tables over cards where there is real data. Do not add whitespace by removing
information.

**Detail is ranked, not deleted.** Payload hashes, tool names and policy rules sit inside
collapsed *Technical details* blocks, open by default only for platform owners. If something
looks like clutter, it may be evidence somebody needs. Ask before removing.

**Risk and confidence are different things.** They sit side by side on the decision screen on
purpose. Confidence says how good the case is; risk says how much it matters if it is wrong. A
green confidence bar must never read as permission to skip the risk.

**Nothing may imply an agent acted alone.** Every write in this product goes to a person first.
Copy and iconography should never suggest otherwise.

---

## Rough edges you'll spot, and whether they're mine or yours

| Thing | Whose |
|---|---|
| No empty, loading or error states to speak of | Yours if you want them, happy to build |
| No mobile layout. Desktop only, minimum ~1100px | Deliberate for now, tell me if that's wrong |
| No dark mode | Not attempted |
| Long agent replies in the chat can push the confirm block below the fold | Known, worth fixing |
| Admin sub-nav is seven items in two groups, still busy | Open to a better idea |
| Icons are text glyphs (▶ ✓ ✕), not an icon set | Deliberate to avoid a dependency, replace freely |

---

## Fake, and staying fake

Every firm, matter, job and person is invented. There is no client data and no PHI, and there
must not be. The NetSuite links point at one real record that holds test data, so clicking
through goes somewhere real; the job numbers shown on screen are seed values and do not match
that record. That mismatch is intentional.

Agent replies in the chat are scripted in `src/lib/seed.ts` so a demo is deterministic. All
state lives in a React reducer in `src/lib/store.tsx` and persists to sessionStorage.

Questions to jim.ballowe@esquiresolutions.com.

***ESQUIRE CONFIDENTIAL*** — For Internal Use Only
