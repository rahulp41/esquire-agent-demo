import { redirect } from "next/navigation";

/**
 * Approvals no longer have their own queue. They are action items, and action
 * items live on My work alongside the questions agents ask — a person should
 * not have to know which of the two a thing is before they can find it.
 */
export default function ApprovalsRedirect() {
  redirect("/");
}
