import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/server-only-shim.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./vitest.global-setup.ts",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/__tests__/**/*.test.ts",
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
