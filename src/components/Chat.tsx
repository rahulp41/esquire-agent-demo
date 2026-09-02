"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Tag } from "@/components/ui/Bits";
import { ToolCallCard } from "@/components/ToolCallCard";
import type { Agent, ChatMessage } from "@/lib/types";
import { CHAT_SCRIPTS, DEFAULT_CHAT } from "@/lib/seed";

let msgSeq = 0;
const mid = () => `local-${++msgSeq}`;

/**
 * Interactive session with an agent. Slide 3 of the reference architecture:
 * the person acts with their own permissions, reads flow freely, and writes are
 * gated tool by tool with an inline confirmation for the higher-risk ones.
 *
 * Responses are scripted so a demo is deterministic. The shape of the exchange,
 * a message plus the governed tool calls that produced it, is what a live
 * session against the Agent SDK renders.
 */
export function Chat({ agent }: { agent: Agent }) {
  const { user } = useStore();
  const script = CHAT_SCRIPTS[agent.slug] ?? DEFAULT_CHAT;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turn, setTurn] = useState(0);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const nextPrompt = script[turn]?.prompt;

  const exhausted: ChatMessage = {
    id: "",
    author: "agent",
    at: "",
    text:
      "That is past the end of this agent's scripted demo. A live session would keep going here, calling the same governed tools and rendering each verdict inline. Reset the demo from the header to run the scripted path again.",
    toolCalls: [],
  };

  function send(text: string) {
    if (!text.trim() || thinking) return;
    const step = script[turn];
    setMessages((m) => [
      ...m,
      { id: mid(), author: "user", text, at: new Date().toISOString() },
    ]);
    setDraft("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        { ...(step ? step.reply : exhausted), id: mid(), at: new Date().toISOString() },
      ]);
      setThinking(false);
      setTurn((t) => t + 1);
    }, 900);
  }

  return (
    <div className="bg-white border border-line rounded-[10px] flex flex-col h-[640px]">
      <header className="px-4 py-2.5 border-b border-line flex items-center justify-between gap-3">
        <div className="text-[12.5px] text-ink">
          You are asking as <strong className="text-ink-strong">{user.name}</strong>. The agent
          can only reach what you can reach.
        </div>
        <Tag tone="sage">Interactive mode</Tag>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-[13px] text-ink max-w-xl">
            <p className="font-semibold text-ink-strong">
              Ask {agent.name} something, or use a suggested prompt below.
            </p>
            <p className="mt-2">
              You will see each step it takes as it takes it. Anything that would change a record
              stops here and comes to you to approve first.
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.author === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="bg-navy text-white rounded-[10px] rounded-br-[3px] px-3.5 py-2 text-[13.5px] max-w-[72%]">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2 max-w-[92%]">
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="space-y-1.5">
                  {m.toolCalls.map((t) => (
                    <ToolCallCard key={t.id} call={t} />
                  ))}
                </div>
              )}
              <div className="bg-bgmuted border border-line rounded-[10px] rounded-bl-[3px] px-3.5 py-2.5 text-[13.5px] text-ink-strong whitespace-pre-line">
                {m.text}
              </div>
              {m.pendingWrite && <InlineConfirm intentId={m.pendingWrite.intentId} label={m.pendingWrite.confirmLabel} />}
            </div>
          ),
        )}

        {thinking && (
          <div className="text-[12.5px] text-ink flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse" aria-hidden />
            {agent.name} is working. Each step appears as it finishes.
          </div>
        )}
        <div ref={endRef} />
      </div>

      {nextPrompt && !thinking && (
        <div className="px-4 py-2 border-t border-line flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/70">
            Try
          </span>
          <button
            onClick={() => send(nextPrompt)}
            className="text-[12.5px] text-navy border border-line rounded-full px-3 py-1 hover:border-navy-600 bg-white"
          >
            {nextPrompt}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="px-4 py-3 border-t border-line flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${agent.name}`}
          aria-label={`Message ${agent.name}`}
          className="flex-1 border border-line rounded-[8px] px-3 py-2 text-[13.5px] bg-white"
        />
        <Button variant="primary" type="submit" disabled={!draft.trim() || thinking}>
          Send
        </Button>
      </form>
    </div>
  );
}

function InlineConfirm({ intentId, label }: { intentId: string; label: string }) {
  const { intents, decide, user } = useStore();
  const intent = intents.find((i) => i.id === intentId);
  if (!intent) return null;

  if (intent.state !== "pending") {
    return (
      <div className="border border-line rounded-[8px] px-3.5 py-2.5 bg-white text-[12.5px]">
        {intent.state === "rejected" ? (
          <span className="text-danger font-semibold">
            Rejected by {intent.decidedBy}. Nothing was written.
          </span>
        ) : (
          <span className="text-brandgreen font-semibold">
            Approved by {intent.decidedBy}. The change was made and checked.
          </span>
        )}{" "}
        <Link href={`/approvals/${intent.id}`} className="text-navy underline">
          View the detail
        </Link>
      </div>
    );
  }

  return (
    <div className="border-2 border-gold/60 bg-gold/8 rounded-[10px] px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-[0.06em] font-bold text-[#7a5f10]">
        Needs your approval before it happens
      </div>
      <p className="text-[13px] text-ink-strong mt-1">{label}</p>
      <p className="text-[12px] text-ink mt-1">
        {intent.risk === "high" ? "Higher risk. " : ""}
        {intent.diff.length} field{intent.diff.length === 1 ? "" : "s"} would change on{" "}
        {intent.target.label}.
      </p>
      <div className="flex flex-wrap gap-2 mt-2.5">
        <Button
          variant="primary"
          onClick={() => decide(intent.id, "approved", `Confirmed inline by ${user.name}.`)}
        >
          Confirm and execute
        </Button>
        <Link href={`/approvals/${intent.id}`}>
          <Button variant="secondary">See the full detail</Button>
        </Link>
        <Button
          variant="danger"
          onClick={() => decide(intent.id, "rejected", `Declined inline by ${user.name}.`)}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
