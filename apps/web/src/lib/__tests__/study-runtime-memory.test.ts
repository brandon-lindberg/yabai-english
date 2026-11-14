import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const { load } = createRequire(import.meta.url)("js-yaml") as { load: (yaml: string) => { services: Array<{ name: string; buildCommand: string; envVars: Array<{ key: string }> }> } };
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

test("production loads route modules when visited instead of preloading every feature", async () => {
  const { default: config } = await import("../../../next.config");
  expect(config.experimental?.preloadEntriesOnStart).toBe(false);
});

test("production start keeps its heap below the 512 MiB service even with a stale build-only NODE_OPTIONS", () => {
  const args = pkg.scripts.start.split(" ");
  expect(args.shift()).toBe("node");
  const flags = args.filter((arg: string) => arg.startsWith("--max-"));
  const result = spawnSync(process.execPath, [...flags, "-e", "process.stdout.write(String(require('node:v8').getHeapStatistics().heap_size_limit))"], {
    encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(Number(result.stdout)).toBeGreaterThan(128 * 1024 * 1024);
  expect(Number(result.stdout)).toBeLessThan(300 * 1024 * 1024);
});

test("Render scopes its large build heap to the build command", () => {
  const web = load(readFileSync("../../render.yaml", "utf8")).services.find(service => service.name === "english-platform-web")!;
  expect(web.buildCommand).toContain("NODE_OPTIONS=--max-old-space-size=4096 yarn build");
  expect(web.envVars.some(variable => variable.key === "NODE_OPTIONS")).toBe(false);
});
