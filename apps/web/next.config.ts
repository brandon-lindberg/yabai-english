import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const teachingArtwork = ["./data/teaching-achievement-art/*.png"];

const nextConfig: NextConfig = {
  // Load features when visited; preloading every route exhausts the small server.
  experimental: { preloadEntriesOnStart: false },
  allowedDevOrigins: ["englishstudiojapan.localhost", "japanesestudio.localhost"],
  // An isolated browser run must not take the active developer server's lock.
  distDir: process.env.MIRROR_QA_DIST_DIR ?? ".next",
  typescript: { tsconfigPath: process.env.MIRROR_QA_DIST_DIR ? "tsconfig.mirror.json" : "tsconfig.json" },
  outputFileTracingIncludes: {
    "/api/achievement-art/*": teachingArtwork,
    "/api/japanese-study/attribution": ["./data/japanese-content/ATTRIBUTION.md"],
    "/**/dashboard/art-gallery": teachingArtwork,
    "/**/dashboard": teachingArtwork,
  },
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
