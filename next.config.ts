import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Runs, Activity and Governance moved under /admin in the simplified build.
   * Anyone with a bookmark, or muscle memory from the 3100 build, would
   * otherwise hit a 404 on a page that still exists. Permanent redirects keep
   * every previously valid URL working.
   */
  async redirects() {
    return [
      { source: "/runs", destination: "/admin/runs", permanent: true },
      { source: "/runs/:id", destination: "/admin/runs/:id", permanent: true },
      { source: "/activity", destination: "/admin/activity", permanent: true },
      { source: "/governance", destination: "/admin/governance", permanent: true },
    ];
  },
};

export default nextConfig;
