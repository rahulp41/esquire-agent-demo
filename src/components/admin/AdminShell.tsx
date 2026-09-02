"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Empty, Panel } from "@/components/ui/Bits";

/**
 * Two clusters, not seven tabs. Operating the platform and configuring it are
 * different jobs done at different times, and a flat row of seven made you read
 * all of them to find either.
 */
const GROUPS: { label: string; tabs: { href: string; label: string; exact?: boolean }[] }[] = [
  {
    label: "Operate",
    tabs: [
      { href: "/admin", label: "Control room", exact: true },
      { href: "/admin/runs", label: "Runs" },
      { href: "/admin/activity", label: "Activity" },
    ],
  },
  {
    label: "Configure",
    tabs: [
      { href: "/admin/config", label: "Configuration" },
      { href: "/admin/runbooks", label: "Runbooks" },
      { href: "/admin/models", label: "Models" },
      { href: "/admin/governance", label: "Governance" },
    ],
  },
];

/**
 * Wraps every admin screen: entitlement check, then the sub-nav.
 *
 * The gate is on the platform-owner role. In production the same check happens
 * at the gateway, so a non-admin who guesses the URL reaches nothing either way.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, user } = useStore();
  const pathname = usePathname();

  if (!isAdmin) {
    return (
      <Panel title="Not entitled">
        <Empty>
          Agent configuration is restricted to platform owners. You are signed in as{" "}
          <strong>{user.name}</strong> ({user.oktaGroup}), which does not carry that
          entitlement. Switch identity in the header to see this area.
        </Empty>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 border-b border-line pb-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h1 className="text-[24px] font-bold text-navy leading-tight">Agent administration</h1>
          <span className="text-[11.5px] text-ink ml-auto">
            Changes here are live on the next run and land on the activity ledger.
          </span>
        </div>
        <nav className="flex flex-wrap items-start gap-4" aria-label="Admin sections">
          {GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="w-full bg-line rounded-[6px] px-2 py-1 text-[10.5px] uppercase tracking-[0.07em] font-bold text-ink/50">
                {group.label}
              </span>
              <div className="flex items-center gap-1">
                {group.tabs.map((t) => {
                  const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={`px-2.5 py-1 rounded-[7px] text-[13px] font-semibold transition-colors ${
                        active ? "bg-navy text-white" : "text-navy hover:bg-navy/8"
                      }`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
