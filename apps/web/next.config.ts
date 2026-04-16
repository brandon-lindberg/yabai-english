import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /**
   * Without this, Turbopack can treat `apps/` (parent of this package) as the workspace
   * root. PostCSS then resolves `@import "tailwindcss"` from `apps/node_modules`, which
   * does not exist. Pin the root to this app so `tailwindcss` resolves from
   * `apps/web/node_modules`.
   */
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withNextIntl(nextConfig);
