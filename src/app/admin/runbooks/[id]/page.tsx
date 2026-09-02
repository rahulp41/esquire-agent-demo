"use client";

import Link from "next/link";
import { use, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Panel, Tag } from "@/components/ui/Bits";
import {
  RUNBOOK_VARIABLES,
  composePrompt,
  describeTrigger,
  estimateTokens,
  validateRunbook,
} from "@/lib/runbook";
import { ago, stamp } from "@/lib/format";

export default function RunbookEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    runbooks,
    snippets,
    automations,
    agents,
    models,
    saveRunbook,
    restoreRunbookVersion,
    nowMs,
  } = useStore();

  const runbook = runbooks.find((r) => r.id === id);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const [body, setBody] = useState(runbook?.body ?? "");
  const [includes, setIncludes] = useState<string[]>(runbook?.includes ?? []);
  const [defaults, setDefaults] = useState(runbook?.defaults);
  const [note, setNote] = useState("");
  const [showComposed, setShowComposed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const usedBy = useMemo(
    () => automations.filter((a) => a.runbookId === id),
    [automations, id],
  );

  const findings = useMemo(
    () => (runbook ? validateRunbook({ body, includes }, snippets, usedBy) : []),
    [runbook, body, includes, snippets, usedBy],
  );

  if (!runbook || !defaults) {
    return (
      <Panel>
        <p className="text-[13px] text-ink">
          No runbook with id {id}.{" "}
          <Link href="/admin/runbooks" className="text-navy font-semibold underline">
            Back to the library
          </Link>
          .
        </p>
      </Panel>
    );
  }

  const dirty =
    body !== runbook.body ||
    JSON.stringify(includes) !== JSON.stringify(runbook.includes) ||
    JSON.stringify(defaults) !== JSON.stringify(runbook.defaults);

  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");

  const primary = usedBy[0];
  const agent = agents.find((a) => a.slug === primary?.agentSlug);

  const composed = composePrompt({ ...runbook, body, includes, defaults }, snippets, {
    agentName: agent?.name ?? "the agent",
    identity: primary?.agentSlug ?? "unbound",
    systems: agent?.systems ?? ["not bound to an automation yet"],
    trigger: primary ? describeTrigger(primary.trigger) : "This runbook is not wired to a trigger.",
  });

  /** Insert at the caret, so the toolbar behaves the way an editor should. */
  function insert(text: string) {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = body.slice(0, start) + text + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  }

  return (
    <div className="space-y-3">
      <nav className="text-[12.5px] text-ink">
        <Link href="/admin/runbooks" className="text-navy font-semibold hover:underline">
          Runbooks
        </Link>{" "}
        / <span className="mono">{runbook.name}</span> / edit
      </nav>

      {/* Dependency banner, before the editor rather than after saving. */}
      <div
        className={`border rounded-[10px] px-4 py-3 ${
          usedBy.length ? "border-sage/50 bg-sage/8" : "border-gold/50 bg-gold/8"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[13px] font-bold text-ink-strong">
            {usedBy.length === 0
              ? "No automation uses this runbook"
              : `Live for ${usedBy.length} automation${usedBy.length === 1 ? "" : "s"} on their next run`}
          </span>
          {usedBy.map((a) => (
            <Link key={a.id} href={`/admin/config/automations/${a.id}`}>
              <Tag tone={a.enabled ? "sage" : "neutral"}>
                {a.name}
                {a.enabled ? "" : " (paused)"}
              </Tag>
            </Link>
          ))}
        </div>
        <p className="text-[12px] text-ink mt-1">
          {usedBy.length === 0
            ? "Edits here change nothing until an automation points at it."
            : "There is no deploy step. Saving changes behaviour the next time any of these start."}
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-3 items-start">
        {/* ---------------------------------------------------------- editor */}
        <Panel flush>
          <div className="px-3 py-2 border-b border-line flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy">
              {runbook.name}
            </span>
            <Tag tone="neutral">v{runbook.versions[0]?.version ?? 1}</Tag>
            {dirty && <Tag tone="gold">Unsaved</Tag>}
            <span className="text-[11.5px] text-ink ml-auto tabular">
              {body.length.toLocaleString()} chars
            </span>
          </div>

          <div className="px-3 py-2 border-b border-line space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.06em] font-bold text-ink/70 w-[92px]">
                Insert variable
              </span>
              {RUNBOOK_VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => insert(`\${${v}}`)}
                  className="mono text-[11px] border border-line rounded px-1.5 py-0.5 bg-white hover:border-navy-600"
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.06em] font-bold text-ink/70 w-[92px]">
                Include
              </span>
              {snippets.map((s) => {
                const on = includes.includes(s.id);
                return (
                  <button
                    key={s.id}
                    title={s.summary}
                    onClick={() =>
                      setIncludes(
                        on ? includes.filter((x) => x !== s.id) : [...includes, s.id],
                      )
                    }
                    aria-pressed={on}
                    className={`mono text-[11px] border rounded px-1.5 py-0.5 ${
                      on
                        ? "border-sage bg-sage/20 text-brandgreen font-semibold"
                        : "border-line bg-white hover:border-navy-600 text-ink"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {s.name}
                    {s.onDemand ? " ·on demand" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            ref={textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            aria-label="Runbook body"
            className="w-full h-[520px] px-3 py-3 mono text-[12px] leading-[1.65] resize-y focus:outline-none"
          />
        </Panel>

        {/* --------------------------------------------------------- preview */}
        <div className="space-y-3">
          <Panel flush>
            <div className="px-3 py-2 border-b border-line flex items-center gap-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy">
                Preview
              </span>
              <label className="text-[12px] text-ink flex items-center gap-1.5 ml-auto">
                <input
                  type="checkbox"
                  checked={showComposed}
                  onChange={(e) => setShowComposed(e.target.checked)}
                />
                Show the composed prompt
              </label>
            </div>
            <div className="px-3 py-3 max-h-[420px] overflow-y-auto">
              {showComposed ? (
                <>
                  <p className="text-[11.5px] text-ink mb-2">
                    Exactly what the agent receives, header and snippets resolved. Roughly{" "}
                    <span className="tabular font-semibold">
                      {estimateTokens(composed).toLocaleString()}
                    </span>{" "}
                    tokens before any work item content is added.
                  </p>
                  <pre className="mono text-[11.5px] leading-[1.6] whitespace-pre-wrap text-ink-strong">
                    {composed}
                  </pre>
                </>
              ) : (
                <pre className="mono text-[12px] leading-[1.65] whitespace-pre-wrap text-ink-strong">
                  {body}
                </pre>
              )}
            </div>
          </Panel>

          <Panel
            title="Validation"
            subtitle="Runs as you type. An error means the runbook would break a stated guardrail."
          >
            {findings.length === 0 ? (
              <p className="text-[13px] text-brandgreen font-semibold">
                Nothing to flag. This runbook is safe to save.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...errors, ...warnings].map((f, i) => (
                  <li
                    key={i}
                    className={`border-l-[3px] pl-3 ${
                      f.level === "error" ? "border-danger" : "border-gold"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag tone={f.level === "error" ? "danger" : "gold"}>
                        {f.level === "error" ? "Error" : "Warning"}
                      </Tag>
                      <span className="text-[12.5px] font-semibold text-ink-strong">
                        {f.message}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink mt-0.5">{f.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------------------------- save */}
      <Panel title="Save">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[280px]">
            <label htmlFor="note" className="text-[12px] font-bold text-ink-strong">
              What changed, and why
            </label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Require a named validator before proposing a correction"
              className="w-full mt-1 border border-line rounded-[8px] px-3 py-2 text-[13px] bg-white"
            />
          </div>
          <Button
            variant="primary"
            disabled={!dirty || errors.length > 0}
            onClick={() => {
              saveRunbook(runbook.id, body, includes, defaults, note || "No note given");
              setNote("");
            }}
          >
            Save as v{(runbook.versions[0]?.version ?? 0) + 1}
          </Button>
          <Button
            variant="ghost"
            disabled={!dirty}
            onClick={() => {
              setBody(runbook.body);
              setIncludes(runbook.includes);
              setDefaults(runbook.defaults);
            }}
          >
            Discard changes
          </Button>
        </div>
        <p className="text-[12px] text-ink mt-2">
          {errors.length > 0
            ? "Fix the errors first. A runbook that breaks a guardrail cannot be saved."
            : dirty
              ? `Saving records a configuration change on the ledger and takes effect on the next run of ${usedBy.length} automation${usedBy.length === 1 ? "" : "s"}.`
              : "No unsaved changes."}
        </p>
      </Panel>

      {/* ------------------------------------------------------- defaults -- */}
      <Panel
        title="Defaults for every automation using this runbook"
        subtitle="An automation may override any of these, but most never need to."
        flush
      >
        <table className="data-grid">
          <tbody>
            <tr>
              <td className="text-[12.5px] font-semibold text-ink-strong w-[240px]">Model</td>
              <td>
                <select
                  value={defaults.model}
                  aria-label="Model"
                  onChange={(e) => setDefaults({ ...defaults, model: e.target.value })}
                  className="border border-line rounded-[7px] px-2 py-1 text-[12.5px] mono bg-white"
                >
                  {models
                    .filter((m) => m.status !== "retired")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} — cleared to {m.approvedUpTo}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
            {(
              [
                ["readScope", "Read scope"],
                ["targetStatus", "On finish"],
              ] as const
            ).map(([k, label]) => (
              <tr key={k}>
                <td className="text-[12.5px] font-semibold text-ink-strong">{label}</td>
                <td>
                  <input
                    value={defaults[k]}
                    aria-label={label}
                    onChange={(e) => setDefaults({ ...defaults, [k]: e.target.value })}
                    className="w-full max-w-lg border border-line rounded-[7px] px-2 py-1 text-[12.5px] bg-white"
                  />
                </td>
              </tr>
            ))}
            {(
              [
                ["wallClockCapMinutes", "Wall-clock cap, minutes"],
                ["retryCap", "Retries"],
              ] as const
            ).map(([k, label]) => (
              <tr key={k}>
                <td className="text-[12.5px] font-semibold text-ink-strong">{label}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={defaults[k]}
                    aria-label={label}
                    onChange={(e) =>
                      setDefaults({ ...defaults, [k]: Number(e.target.value) || 1 })
                    }
                    className="w-24 border border-line rounded-[7px] px-2 py-1 text-[12.5px] tabular bg-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* -------------------------------------------------------- history -- */}
      <Panel flush>
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          aria-expanded={historyOpen}
          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f7f9fb]"
        >
          <span
            aria-hidden
            className={`text-ink/50 text-[10px] transition-transform ${historyOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy">
            Version history
          </span>
          <span className="text-[12.5px] text-ink ml-auto">
            Last {runbook.versions.length} kept, oldest dropped past ten
          </span>
        </button>
        {historyOpen && (
          <table className="data-grid">
            <thead>
              <tr>
                <th>Version</th>
                <th>What changed</th>
                <th>Who</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {runbook.versions.map((v, i) => (
                <tr key={v.version}>
                  <td className="mono font-semibold text-navy">v{v.version}</td>
                  <td className="text-[12.5px] max-w-[460px]">{v.note}</td>
                  <td className="text-[12.5px]">{v.author}</td>
                  <td className="text-[12px] whitespace-nowrap">
                    {ago(v.at, nowMs)}
                    <div className="text-ink/60">{stamp(v.at)}</div>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {i === 0 ? (
                      <Tag tone="green">Current</Tag>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          restoreRunbookVersion(runbook.id, v.version);
                          setBody(v.body);
                        }}
                      >
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
