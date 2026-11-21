import { expect, test } from "vitest";
import { nodeCommandTestTimeout, runNodeCommand } from "../../../../test/node-command";

test("Google integration entry points load Calendar without unrelated API services", async () => {
  const result = await runNodeCommand(["--conditions=react-server", "--import", "tsx", "-e", String.raw`
    for (const file of ["google-calendar", "google/oauth-service", "google/meeting-notes-link"]) require("./src/lib/" + file + ".ts");
    const paths = Object.keys(require.cache).map(file => file.split(require("node:path").sep).join("/"));
    const services = [...new Set(paths.flatMap(file => {
      const service = file.match(/\/node_modules\/(@googleapis\/[^/]+)\//)?.[1];
      return service ? [service] : [];
    }))].sort();
    process.stdout.write(JSON.stringify({
      services,
      umbrellaLoaded: paths.some(file => file.includes("/node_modules/googleapis/")),
    }));
  `], { env: { ...process.env, DATABASE_URL: "postgresql://test:test@localhost:1/test", NODE_ENV: "production" } });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    services: ["@googleapis/calendar"],
    umbrellaLoaded: false,
  });
}, nodeCommandTestTimeout());
