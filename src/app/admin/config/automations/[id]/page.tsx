"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Panel, Tag } from "@/components/ui/Bits";
import { TRIGGER_LABELS, describeQuery, describeTrigger } from "@/lib/runbook";
import type { Automation, Trigger, TriggerType } from "@/lib/types";

/** A selectable tile. Used for all three questions so the flow reads the same. */
function Choice({
  selected,
  title,
  blurb,
  onClick,
}: {
  selected: boolean;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left border rounded-[10px] p-3 transition-colors ${
        selected
          ? "border-navy bg-navy/5 ring-1 ring-navy"
          : "border-line bg-white hover:border-navy-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-bold text-navy mono">{title}</span>
        {selected && (
          <span aria-hidden className="text-brandgreen text-[13px] font-bold">
            ✓
          </span>
        )}
      </div>
      <p className="text-[12px] text-ink mt-1">{blurb}</p>
    </button>
  );
}

function Step({
  n,
  title,
  blurb,
  children,
}: {
  n: number;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-line rounded-[10px] p-4">
      <div className="flex items-center gap-2.5">
        <span className="w-[22px] h-[22px] rounded-full bg-navy text-white grid place-items-center text-[11px] font-bold shrink-0">
          {n}
        </span>
        <div>
          <h2 className="text-[14px] font-bold text-navy">{title}</h2>
          <p className="text-[12.5px] text-ink">{blurb}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AutomationBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { automations, runbooks, agents, models, saveAutomation, toggleAutomation, user } =
    useStore();

  const isNew = id === "new";
  const existing = automations.find((a) => a.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [agentSlug, setAgentSlug] = useState(existing?.agentSlug ?? "");
  const [runbookId, setRunbookId] = useState(existing?.runbookId ?? "");
  const [trigger, setTrigger] = useState<Trigger>(
    existing?.trigger ?? { type: "schedule", everyHours: 24 },
  );
  const [concurrency, setConcurrency] = useState(existing?.concurrency ?? 1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [overrides, setOverrides] = useState(existing?.overrides ?? {});

  if (!isNew && !existing) {
    return (
      <Panel>
        <p className="text-[13px] text-ink">
          No automation with id {id}.{" "}
          <Link href="/admin/config" className="text-navy font-semibold underline">
            Back to configuration
          </Link>
          .
        </p>
      </Panel>
    );
  }

  const runbook = runbooks.find((r) => r.id === runbookId);
  const defaults = runbook?.defaults;
  const query = describeQuery(trigger.query ?? "");

  const complete = Boolean(name.trim() && agentSlug && runbookId);
  const triggerReady =
    trigger.type !== "filter" || Boolean(trigger.query?.trim() && query.understood);

  function save() {
    if (!complete || !triggerReady) return;
    const automation: Automation = {
      id: existing?.id ?? `auto-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: name.trim(),
      agentSlug,
      runbookId,
      trigger,
      enabled: existing?.enabled ?? false,
      owner: existing?.owner ?? user.name,
      concurrency,
      lastPollAt: existing?.lastPollAt,
      runsLast24h: existing?.runsLast24h ?? 0,
      overrides,
    };
    saveAutomation(automation, isNew);
    router.push("/admin/config");
  }

  const effective = <K extends keyof NonNullable<typeof defaults>>(key: K) =>
    (overrides[key] ?? defaults?.[key]) as NonNullable<typeof defaults>[K] | undefined;

  return (
    <div className="space-y-3">
      <nav className="text-[12.5px] text-ink">
        <Link href="/admin/config" className="text-navy font-semibold hover:underline">
          Configuration
        </Link>{" "}
        / automations / <span className="mono">{isNew ? "new" : existing?.name}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-navy">
            {isNew ? "New automation" : existing?.name}
          </h1>
          <p className="text-[13px] text-ink mt-0.5 max-w-2xl">
            Three questions. Everything else has a working default, inherited from the runbook.
          </p>
        </div>
        {existing && (
          <div className="flex items-center gap-2">
            <Tag tone={existing.enabled ? "green" : "neutral"}>
              {existing.enabled ? "Enabled" : "Paused"}
            </Tag>
            <Button variant="secondary" onClick={() => toggleAutomation(existing.id)}>
              {existing.enabled ? "Pause" : "Resume"}
            </Button>
          </div>
        )}
      </div>

      <section className="bg-white border border-line rounded-[10px] p-4">
        <label htmlFor="auto-name" className="text-[12px] font-bold text-ink-strong">
          Name
        </label>
        <input
          id="auto-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="invoice-dispute-intake"
          className="w-full max-w-md mt-1 border border-line rounded-[8px] px-3 py-2 text-[13px] mono bg-white block"
        />
        <p className="text-[11.5px] text-ink mt-1">
          Appears in the control room and on every ledger entry this automation produces.
        </p>
      </section>

      <Step
        n={1}
        title="Pick an agent"
        blurb="The service identity the work is done as. Comments, edits and receipts all appear under this name."
      >
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {agents.map((a) => (
            <Choice
              key={a.slug}
              selected={agentSlug === a.slug}
              title={a.slug}
              blurb={`${a.name}. ${a.systems.join(", ")}. ${a.tools.length} tools granted.`}
              onClick={() => setAgentSlug(a.slug)}
            />
          ))}
        </div>
      </Step>

      <Step
        n={2}
        title="Pick a runbook"
        blurb="The instructions the agent follows, and what counts as done."
      >
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {runbooks.map((rb) => (
            <Choice
              key={rb.id}
              selected={runbookId === rb.id}
              title={rb.name}
              blurb={rb.summary}
              onClick={() => {
                setRunbookId(rb.id);
                setOverrides({});
              }}
            />
          ))}
        </div>
      </Step>

      <Step n={3} title="Decide how it runs" blurb="What makes this agent start working.">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((t) => (
            <Choice
              key={t}
              selected={trigger.type === t}
              title={TRIGGER_LABELS[t].title}
              blurb={TRIGGER_LABELS[t].blurb}
              onClick={() =>
                setTrigger(
                  t === "schedule"
                    ? { type: "schedule", everyHours: trigger.everyHours ?? 24 }
                    : t === "filter"
                      ? { type: "filter", query: trigger.query ?? "" }
                      : { type: t, scope: trigger.scope ?? "project IT" },
                )
              }
            />
          ))}
        </div>

        {/* Trigger-specific configuration, plus the sentence read back before saving. */}
        <div className="mt-3 border border-line rounded-[10px] p-3 bg-bgmuted">
          {trigger.type === "schedule" && (
            <>
              <div className="flex items-end gap-2 flex-wrap">
                <div>
                  <label htmlFor="every" className="text-[12px] font-bold text-ink-strong">
                    Run every
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="every"
                      type="number"
                      min={1}
                      max={168}
                      value={trigger.everyHours ?? 24}
                      onChange={(e) =>
                        setTrigger({ type: "schedule", everyHours: Number(e.target.value) || 1 })
                      }
                      className="w-20 border border-line rounded-[8px] px-2 py-1.5 text-[13px] tabular bg-white"
                    />
                    <span className="text-[13px] text-ink">hours</span>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-ink mt-2">
                A run that overruns its own schedule does not stack. The next tick is skipped until
                it finishes.
              </p>
            </>
          )}

          {trigger.type === "filter" && (
            <>
              <label htmlFor="query" className="text-[12px] font-bold text-ink-strong">
                Filter
              </label>
              <input
                id="query"
                value={trigger.query ?? ""}
                onChange={(e) => setTrigger({ type: "filter", query: e.target.value })}
                placeholder="project = IT AND status = Open AND assignee IS EMPTY"
                className="w-full mt-1 border border-line rounded-[8px] px-3 py-2 text-[12.5px] mono bg-white"
              />
              <div
                className={`mt-2 border-l-[3px] pl-3 py-1 ${
                  query.understood ? "border-sage" : "border-danger"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
                  What this means
                </div>
                <p
                  className={`text-[13px] mt-0.5 ${
                    query.understood ? "text-ink-strong" : "text-danger"
                  }`}
                >
                  {query.sentence}
                </p>
                {query.unparsed.length > 0 && (
                  <p className="text-[12px] text-danger mt-1">
                    Could not read back: {query.unparsed.map((u) => `"${u}"`).join(", ")}. Fix it
                    before saving, because an automation that watches the wrong queue looks healthy
                    while it does the wrong work.
                  </p>
                )}
              </div>
            </>
          )}

          {(trigger.type === "mention" || trigger.type === "assignment") && (
            <>
              <label htmlFor="scope" className="text-[12px] font-bold text-ink-strong">
                Where to watch
              </label>
              <input
                id="scope"
                value={trigger.scope ?? ""}
                onChange={(e) => setTrigger({ type: trigger.type, scope: e.target.value })}
                placeholder="project IT"
                className="w-full max-w-md mt-1 border border-line rounded-[8px] px-3 py-2 text-[12.5px] mono bg-white block"
              />
              <p className="text-[13px] text-ink-strong mt-2">{describeTrigger(trigger)}</p>
            </>
          )}
        </div>
      </Step>

      {/* Everything that is not one of the three questions. */}
      <Panel flush>
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f7f9fb]"
        >
          <span
            aria-hidden
            className={`text-ink/50 text-[10px] transition-transform ${advancedOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy">
            Advanced options
          </span>
          <span className="text-[12.5px] text-ink ml-auto">
            {Object.keys(overrides).length === 0
              ? "All inherited from the runbook"
              : `${Object.keys(overrides).length} overridden`}
          </span>
        </button>

        {advancedOpen && (
          <div className="border-t border-line px-4 py-3.5">
            {!runbook ? (
              <p className="text-[13px] text-ink">Pick a runbook to see its defaults.</p>
            ) : (
              <>
                <p className="text-[12.5px] text-ink mb-3 max-w-3xl">
                  These come from{" "}
                  <Link
                    href={`/admin/runbooks/${runbook.id}`}
                    className="text-navy font-semibold underline"
                  >
                    {runbook.name}
                  </Link>
                  . Override one here only when this automation genuinely differs, because an
                  override is a second place to look when something misbehaves.
                </p>
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Value</th>
                      <th>Source</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["model", "Model"],
                        ["readScope", "Read scope"],
                        ["targetStatus", "On finish"],
                        ["wallClockCapMinutes", "Wall-clock cap, minutes"],
                        ["retryCap", "Retries"],
                      ] as const
                    ).map(([key, label]) => {
                      const overridden = key in overrides;
                      const value = effective(key);
                      return (
                        <tr key={key}>
                          <td className="text-[12.5px] font-semibold text-ink-strong">{label}</td>
                          <td>
                            {key === "model" ? (
                              <select
                                value={String(value ?? "")}
                                onChange={(e) =>
                                  setOverrides({ ...overrides, model: e.target.value })
                                }
                                aria-label={label}
                                className="border border-line rounded-[7px] px-2 py-1 text-[12.5px] mono bg-white"
                              >
                                {models
                                  .filter((m) => m.status !== "retired")
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.id}
                                    </option>
                                  ))}
                              </select>
                            ) : typeof value === "number" ? (
                              <input
                                type="number"
                                min={1}
                                value={value}
                                aria-label={label}
                                onChange={(e) =>
                                  setOverrides({ ...overrides, [key]: Number(e.target.value) || 1 })
                                }
                                className="w-20 border border-line rounded-[7px] px-2 py-1 text-[12.5px] tabular bg-white"
                              />
                            ) : (
                              <input
                                value={String(value ?? "")}
                                aria-label={label}
                                onChange={(e) =>
                                  setOverrides({ ...overrides, [key]: e.target.value })
                                }
                                className="w-full min-w-[240px] border border-line rounded-[7px] px-2 py-1 text-[12.5px] bg-white"
                              />
                            )}
                          </td>
                          <td>
                            {overridden ? (
                              <Tag tone="gold">Overridden here</Tag>
                            ) : (
                              <Tag tone="neutral">Inherited</Tag>
                            )}
                          </td>
                          <td className="text-right">
                            {overridden && (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  const next = { ...overrides };
                                  delete next[key];
                                  setOverrides(next);
                                }}
                              >
                                Reset
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="text-[12.5px] font-semibold text-ink-strong">
                        Concurrency
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={concurrency}
                          aria-label="Concurrency"
                          onChange={(e) => setConcurrency(Number(e.target.value) || 1)}
                          className="w-20 border border-line rounded-[7px] px-2 py-1 text-[12.5px] tabular bg-white"
                        />
                      </td>
                      <td>
                        <Tag tone="neutral">Set on the automation</Tag>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </Panel>

      <div className="bg-white border border-line rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={save} disabled={!complete || !triggerReady}>
          {isNew ? "Create automation" : "Save changes"}
        </Button>
        <Link href="/admin/config">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <span className="text-[12.5px] text-ink ml-auto max-w-xl text-right">
          {!complete
            ? "Give it a name, an agent and a runbook."
            : !triggerReady
              ? "The filter cannot be read back in plain English yet."
              : isNew
                ? "New automations are created paused. Enable it from the control room when you are ready."
                : "Saving records a configuration change on the activity ledger."}
        </span>
      </div>
    </div>
  );
}
