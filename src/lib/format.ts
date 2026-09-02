import { DEMO_NOW } from "./seed";

const TZ = "America/New_York";

export function timeOf(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function dayOf(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
}

export function stamp(isoStr: string): string {
  return `${dayOf(isoStr)} ${timeOf(isoStr)} ET`;
}

/** Relative label measured against the fixed demo clock, plus live drift. */
export function ago(isoStr: string, nowMs: number = DEMO_NOW.getTime()): string {
  const delta = Math.round((nowMs - new Date(isoStr).getTime()) / 1000);
  if (delta < 0) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const m = Math.round(delta / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Countdown to an approval expiry. Negative means the window has closed. */
export function remaining(expiresAt: string, nowMs: number): {
  label: string;
  expired: boolean;
  urgent: boolean;
} {
  const delta = Math.round((new Date(expiresAt).getTime() - nowMs) / 1000);
  if (delta <= 0) return { label: "expired", expired: true, urgent: true };
  const h = Math.floor(delta / 3600);
  const m = Math.floor((delta % 3600) / 60);
  const s = delta % 60;
  const label = h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  return { label, expired: false, urgent: delta < 30 * 60 };
}

export function duration(ms?: number): string {
  if (ms === undefined) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
