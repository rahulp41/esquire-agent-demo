"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Empty, Panel, Tag } from "@/components/ui/Bits";
import type { Agent } from "@/lib/types";

/**
 * What you can ask for, in the language of the ask.
 *
 * The dense operator view of this list — eval scores, tool counts, package
 * versions, runs per month — moved to Admin. What survives is the only thing a
 * person choosing an agent needs: what it does, what it touches, and whether it
 * can change anything without them.
 */

function trust(agent: Agent): { label: string; tone: "green" | "gold" } {
  return agent.writeTier === "read-only"
    ? { label: "Read Only", tone: "green" }
    : { label: "Proposes Changes", tone: "gold" };
}

export default function AgentsCatalog() {
  const { myAgents, isAdmin } = useStore();
  const [query, setQuery] = useState("");
  const [showAdminNotice, setShowAdminNotice] = useState(true);

  const visible = myAgents.filter((a) => {
    if (!query) return true;
    return `${a.name} ${a.summary}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-navy leading-tight">Agents</h1>
          <p className="text-[13.5px] text-ink mt-1 max-w-2xl">
            Ask one of these to do a piece of work. None of them can change a record on their own:
            anything that would write comes back to a person first.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an agent"
          aria-label="Find an agent"
          className="border border-line rounded-[8px] px-3 py-2 text-[13px] w-60 bg-white"
        />
      </div>

      {visible.length === 0 ? (
        <Panel>
          <Empty>No agent matches that.</Empty>
        </Panel>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((a) => {
            const t = trust(a);
            return (
              <Link
                key={a.slug}
                href={`/agents/${a.slug}`}
                className="relative bg-white border border-line rounded-[10px] p-4 flex flex-col hover:border-navy-600 transition-colors"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="absolute top-4 right-4 w-4 h-4 text-ink/50"
                >
                  <path
                    d="M7 17L17 7M9 7h8v8"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h2 className="text-[15px] font-bold text-navy pr-6">{a.name}</h2>
                <p className="text-[13px] text-ink mt-1.5 flex-1">{a.summary}</p>
                <div className="mt-3">
                  <Tag tone={t.tone}>{t.label}</Tag>
                </div>
                <div className="text-[12px] text-ink mt-2">
                  Works with {a.systems.join(", ")}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isAdmin && showAdminNotice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md bg-navy text-white text-[12.5px] rounded-[10px] shadow-lg px-4 py-3 flex items-center gap-3">
          <p>
            You are seeing every agent because you are a platform owner. Everyone else sees only
            the agents their groups entitle them to run.
          </p>
          <button
            onClick={() => setShowAdminNotice(false)}
            aria-label="Dismiss"
            className="shrink-0 text-white/70 hover:text-white text-[15px] leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
