"use client";

import Link from "next/link";
import { use } from "react";
import { useStore } from "@/lib/store";
import { ActionContract } from "@/components/ActionContract";
import { Empty, Panel } from "@/components/ui/Bits";

export default function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { myIntents, intents, user } = useStore();

  const intent = myIntents.find((i) => i.id === id);

  // Exists, but is addressed to another group. Say so plainly rather than
  // pretending it is missing: the person may need to know who to chase.
  const foreign = !intent && intents.find((i) => i.id === id);
  if (foreign) {
    return (
      <Panel title="Not yours to decide">
        <Empty>
          {foreign.id} is waiting on <strong>{foreign.approverGroup}</strong>, and you are not in
          that group. You are signed in as {user.name}.{" "}
          <Link href="/" className="text-navy font-semibold underline">
            Back to your work
          </Link>
          .
        </Empty>
      </Panel>
    );
  }

  if (!intent) {
    return (
      <Panel>
        <Empty>
          Nothing here with id {id}.{" "}
          <Link href="/" className="text-navy font-semibold underline">
            Back to your work
          </Link>
          .
        </Empty>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="text-[12.5px] text-ink">
        <Link href="/" className="text-navy font-semibold hover:underline">
          My work
        </Link>{" "}
        / {intent.id}
      </nav>
      <ActionContract intent={intent} />
    </div>
  );
}
