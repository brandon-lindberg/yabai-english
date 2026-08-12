import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/server-only-shim.ts"),
      // next/navigation is CJS with no exports map; next-intl's ESM build
      // imports it by bare specifier, which Node's resolver rejects under
      // Vite's SSR transform. Point at the file so interop can do its job.
      "next/navigation": path.resolve(__dirname, "./node_modules/next/navigation.js"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // next-intl ships ESM that imports next/navigation, a CJS file with no
    // exports map. Externalised, Node resolves it and fails; inlined, it goes
    // through Vite's resolver and the alias above.
    server: { deps: { inline: ["next-intl"] } },
    globalSetup: "./vitest.global-setup.ts",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/__tests__/**/*.test.tsx",
      "src/app/api/**/__tests__/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});
