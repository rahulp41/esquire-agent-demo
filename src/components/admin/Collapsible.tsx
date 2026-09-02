"use client";

import { useState } from "react";

/**
 * A control-room row. Collapsed by default so the page opens as a stack of
 * headers that already tells you the state of the system. The summary in the
 * header has to carry enough that opening a panel is a choice, not a necessity.
 */
export function Collapsible({
  title,
  summary,
  badges,
  children,
  defaultOpen = false,
  tone = "neutral",
}: {
  title: string;
  summary: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: "neutral" | "active" | "attention";
}) {
  const [open, setOpen] = useState(defaultOpen);

  const edge = {
    neutral: "border-l-line",
    active: "border-l-navy",
    attention: "border-l-gold",
  }[tone];

  return (
    <section
      className={`bg-white border border-line border-l-[3px] ${edge} rounded-[10px] overflow-hidden`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-[#f7f9fb] transition-colors"
      >
        <span
          aria-hidden
          className={`text-ink/50 text-[10px] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy">
          {title}
        </span>
        <span className="text-[12.5px] text-ink flex-1 min-w-[200px]">{summary}</span>
        {badges}
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </section>
  );
}
