"use client";

import Link from "next/link";
import { use } from "react";
import { useStore } from "@/lib/store";
import { Chat } from "@/components/Chat";
import { Button, Empty, Panel, Tag } from "@/components/ui/Bits";
import { canRunAgent } from "@/lib/scope";

export default function AgentWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { agents, myPendingIntents, user, isAdmin } = useStore();
  const agent = agents.find((a) => a.slug === slug);

  if (!agent) {
    return (
      <Panel>
        <Empty>
          No agent named {slug}.{" "}
          <Link href="/agents" className="text-navy font-semibold underline">
            Back to agents
          </Link>
          .
        </Empty>
      </Panel>
    );
  }

  if (!canRunAgent(agent, user)) {
    return (
      <Panel title="Not available to you">
        <Empty>
          Your access does not include {agent.name}. This is enforced where the agent connects to
          the systems, not just in this screen.
        </Empty>
      </Panel>
    );
  }

  const pending = myPendingIntents.filter((i) => i.agentSlug === agent.slug);
  const readOnly = agent.writeTier === "read-only";

  return (
    <div className="space-y-4">
      <nav className="text-[12.5px] text-ink">
        <Link href="/agents" className="text-navy font-semibold hover:underline">
          Agents
        </Link>{" "}
        / {agent.name}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[22px] font-bold text-navy">{agent.name}</h1>
          <p className="text-[13.5px] text-ink mt-1">{agent.summary}</p>
        </div>
        {pending.length > 0 && (
          <Link href={`/approvals/${pending[0].id}`}>
            <Button variant="primary">
              {pending.length} change waiting for you
            </Button>
          </Link>
        )}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
        <Chat agent={agent} />

        <div className="space-y-4">
          <Panel title="What this agent can and cannot do">
            <ul className="space-y-2 text-[13px]">
              <li className="flex gap-2.5">
                <span aria-hidden className="text-brandgreen font-bold">
                  ✓
                </span>
                <span className="text-ink-strong">
                  Reads {agent.systems.join(", ")} to work out what is going on.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="text-brandgreen font-bold">
                  ✓
                </span>
                <span className="text-ink-strong">
                  Shows you the evidence behind anything it concludes.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="text-danger font-bold">
                  ✕
                </span>
                <span className="text-ink-strong">
                  {readOnly
                    ? "Cannot change any record. This agent only reads."
                    : "Cannot change a record on its own. Every change comes to a person first."}
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="text-danger font-bold">
                  ✕
                </span>
                <span className="text-ink-strong">
                  Cannot reach anything outside {agent.systems.join(", ")}, even if you ask.
                </span>
              </li>
            </ul>
          </Panel>

          {isAdmin && (
            <Panel
              title="Configuration"
              subtitle="Visible to you as a platform owner."
              flush
            >
              <table className="data-grid">
                <tbody>
                  <tr>
                    <td className="text-[12.5px] font-semibold text-ink-strong">Package</td>
                    <td className="mono">{agent.version}</td>
                  </tr>
                  <tr>
                    <td className="text-[12.5px] font-semibold text-ink-strong">Owner</td>
                    <td className="text-[12.5px]">
                      {agent.owner}, {agent.team}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-[12.5px] font-semibold text-ink-strong">Eval</td>
                    <td className="text-[12.5px] tabular">
                      <span
                        className={
                          agent.evalScore >= agent.evalThreshold
                            ? "text-brandgreen font-semibold"
                            : "text-danger font-semibold"
                        }
                      >
                        {(agent.evalScore * 100).toFixed(0)}%
                      </span>{" "}
                      against a {(agent.evalThreshold * 100).toFixed(0)}% gate
                    </td>
                  </tr>
                  <tr>
                    <td className="text-[12.5px] font-semibold text-ink-strong align-top">
                      Tool bundle
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        {agent.tools.map((t) => (
                          <span key={t} className="mono text-ink-strong">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-line">
                <Link href="/admin/config" className="text-[12.5px] text-navy font-semibold underline">
                  Open agent configuration
                </Link>
              </div>
            </Panel>
          )}

          {agent.status === "canary" && (
            <div className="text-[12px] text-ink">
              <Tag tone="gold">In trial</Tag>{" "}
              <span className="ml-1">
                This agent is newly changed and being watched closely. Its work is checked more
                often than usual.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
