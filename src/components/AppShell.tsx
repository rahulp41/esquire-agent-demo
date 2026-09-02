"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

/**
 * Two navigations, not one.
 *
 * A standard user gets three items, because there are only three things they
 * do: deal with what needs them, ask an agent for something, and look up what
 * happened. The operator views — runs, ledger, governance, configuration — live
 * under Admin, where the people who need them already are.
 */
const USER_NAV = [
  { href: "/", label: "My work", badge: "actions" as const, match: (p: string) => p === "/" },
  { href: "/agents", label: "Agents", match: (p: string) => p.startsWith("/agents") },
  { href: "/history", label: "History", match: (p: string) => p.startsWith("/history") },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, users, setUser, myPendingIntents, myQuestions, isAdmin, reset } = useStore();
  const pathname = usePathname();

  const actionCount = myPendingIntents.length + myQuestions.length;

  const nav = [
    ...USER_NAV,
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin", match: (p: string) => p.startsWith("/admin") }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy text-white">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="bg-white rounded-[6px] px-2 py-1 flex items-center">
              <Image
                src="/esquire-logo.png"
                alt="Esquire"
                width={400}
                height={100}
                className="h-[16px] w-auto"
                priority
              />
            </span>
            <span className="hidden sm:block text-[13px] font-semibold tracking-wide border-l border-white/25 pl-3">
              Agent Console
            </span>
          </Link>

          <nav className="flex items-center gap-1 flex-1" aria-label="Primary">
            {nav.map((item) => {
              const active = item.match(pathname);
              const count = "badge" in item && item.badge === "actions" ? actionCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors ${
                    active ? "bg-white/15 text-white" : "text-white/75 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {item.label}
                  {count > 0 && (
                    <span
                      className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-navy text-[11px] font-bold tabular"
                      aria-label={`${count} needing you`}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="role-switch" className="text-[11px] uppercase tracking-[0.06em] text-white/60 hidden md:block">
              Signed in as
            </label>
            <div className="relative">
              <select
                id="role-switch"
                value={user.id}
                onChange={(e) => setUser(e.target.value)}
                className="appearance-none bg-navy-700 border border-white/20 rounded-[8px] text-[12.5px] pl-2 pr-7 py-1.5 text-white"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 10 6"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-1.5 fill-none stroke-white/70"
              >
                <path d="M1 1l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span
              className="w-7 h-7 rounded-full bg-gold text-navy grid place-items-center text-[11px] font-bold"
              title={user.name}
            >
              {user.initials}
            </span>
          </div>
        </div>
      </header>

      {/* Platform plumbing belongs to the people who operate the platform. */}
      <div className="bg-white border-b border-line">
        <div className="max-w-[1440px] mx-auto px-6 py-1.5 text-[11.5px] text-ink flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            <strong className="text-navy">Prototype.</strong> Seeded data, no live systems
            connected.
          </span>
          {isAdmin && (
            <>
              <span className="hidden md:inline">
                Identity: <span className="mono">{user.oktaGroup}</span>
              </span>
              <span className="hidden lg:inline">
                Gateway: <span className="mono">mintmcp / esq-prod</span>
              </span>
              <span className="hidden lg:inline">
                Model: <span className="mono">Claude via Bedrock, us-east-1</span>
              </span>
            </>
          )}
          <button
            onClick={reset}
            className="ml-auto text-navy font-semibold underline underline-offset-2"
          >
            Reset demo
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">{children}</main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-3 text-[11px] text-ink flex flex-wrap justify-between gap-2">
          <span>Esquire AI Reference Architecture v11, 27 Aug 2026. Interface prototype.</span>
          <span>Esquire Confidential. For internal use only.</span>
        </div>
      </footer>
    </div>
  );
}
