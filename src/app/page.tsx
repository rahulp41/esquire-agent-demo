"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Confidence, Empty, Panel, RiskPill, Tag } from "@/components/ui/Bits";
import { Countdown } from "@/components/ActionContract";
import { ago } from "@/lib/format";

/**
 * The landing page for everyone who is not operating the platform.
 *
 * It answers one question — what needs me — and it only ever shows items
 * addressed to the signed-in person. No queue of other people's work, no
 * platform metrics, no ledger. Those exist; they are not this person's job.
 */
export default function MyWork() {
  const { user, myPendingIntents, myQuestions, myRuns, nowMs, isAdmin } = useStore();

  const inFlight = myRuns.filter(
    (r) => r.state === "executing" || r.state === "awaiting-approval",
  );
  const total = myPendingIntents.length + myQuestions.length;

  return (
    <div className="space-y-10 max-w-[840px]">
      <div className="space-y-2.5">
        <div>
          <h1 className="text-[24px] font-bold text-navy leading-tight">
            {total === 0 ? `Nothing needs you, ${user.name.split(" ")[0]}` : "Needs approval"}
          </h1>
          <p className="text-[13.5px] text-ink mt-1 max-w-2xl">
            {total === 0
              ? "When an agent proposes a change you have to approve, or asks you a question it cannot answer itself, it appears here."
              : `${total} item${total === 1 ? "" : "s"} where an agent has stopped and is waiting on you. Nothing moves until you decide.`}
          </p>
        </div>

        {/* Approvals: a proposed change, waiting on a decision. */}
        {myPendingIntents.length > 0 && (
          <section className="space-y-2.5">
            {myPendingIntents.map((i) => (
              <article
                key={i.id}
                className="bg-white border border-line rounded-[10px] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-[500px]">
                    <h3 className="text-[13.5px] font-semibold text-navy leading-snug">{i.effect}</h3>
                    <p className="text-[13px] text-ink mt-1">
                      On {i.target.label}, proposed by {i.agentName}.
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1.5">
                    <RiskPill risk={i.risk} />
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px] uppercase tracking-[0.06em] font-bold text-ink/60">
                        Evidence
                      </span>
                      <Confidence value={i.confidence} basis={i.confidenceBasis} size="compact" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-1.5">
                      <div>
                        <div className="text-[12px] text-ink">
                          <Countdown expiresAt={i.expiresAt} /> to decide
                        </div>
                        <div className="text-[12px] text-ink-strong tabular">
                          {(() => {
                            const [amount, ...rest] = (i.monetaryImpact ?? "$--").split(" ");
                            const suffix = rest.join(" ");
                            return (
                              <>
                                <span className="font-semibold">{amount}</span>
                                {suffix && <span className="font-normal"> {suffix}</span>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <Link href={`/approvals/${i.id}`}>
                        <Button variant="primary">Review and decide</Button>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="text-[12px] text-ink mt-3">{ago(i.createdAt, nowMs)}</div>
              </article>
            ))}
          </section>
        )}
      </div>

      {/* Questions: the agent stopped rather than guessing. */}
      {myQuestions.length > 0 && (
        <section className="space-y-2.5">
          <div>
            <h2 className="text-[24px] font-bold text-navy leading-tight">
              Pending agent questions
            </h2>
            <p className="text-[13.5px] text-ink mt-1 max-w-2xl">
              Questions the agent could not answer and need your clarification.
            </p>
          </div>
          {myQuestions.map((q) => (
            <article
              key={q.id}
              className="bg-white border border-line rounded-[10px] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-[14px] text-ink-strong max-w-3xl leading-snug">{q.question}</p>
              </div>
              <p className="text-[12.5px] text-ink mt-2">
                On {q.workItem}. The agent has stopped and changed nothing. It will pick the work
                back up once you reply.
              </p>
              <div className="mt-3">
                <a href={q.workItemUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Provide answer</Button>
                </a>
              </div>
              <div className="text-[12px] text-ink mt-3">asked {ago(q.askedAt, nowMs)}</div>
            </article>
          ))}
        </section>
      )}

      {total === 0 && (
        <Panel>
          <Empty>
            Your queue is clear.{" "}
            <Link href="/agents" className="text-navy font-semibold underline">
              Ask an agent for something
            </Link>{" "}
            or{" "}
            <Link href="/history" className="text-navy font-semibold underline">
              look at what has already happened
            </Link>
            .
          </Empty>
        </Panel>
      )}

      {inFlight.length > 0 && (
        <div className="space-y-2.5">
          <div>
            <h2 className="text-[24px] font-bold text-navy leading-tight">In progress</h2>
            <p className="text-[13.5px] text-ink mt-1 max-w-2xl">
              Work already under way. Nothing here needs you yet.
            </p>
          </div>
          <Panel flush>
            <table className="data-grid">
              <tbody>
                {inFlight.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/history/`}
                        className="text-[13.5px] font-semibold text-navy hover:underline"
                      >
                        {r.title}
                      </Link>
                      <div className="text-[12px] text-ink mt-0.5">{r.agentName}</div>
                      <div className="text-[12px] text-ink mt-0.5">
                        started {ago(r.startedAt, nowMs)}
                      </div>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Tag tone={r.state === "awaiting-approval" ? "gold" : "navy"}>
                        {r.state === "awaiting-approval" ? "Waiting on a person" : "Working"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {isAdmin && (
        <p className="text-[12px] text-ink">
          You are seeing every action item because you are a platform owner. A standard user sees
          only items addressed to a group they belong to.
        </p>
      )}
    </div>
  );
}
