import { expect, test } from "vitest";
import { nodeCommandTestTimeout, runNodeCommand } from "../../../../test/node-command";

test("Google integration entry points load Calendar without unrelated API services", async () => {
  const result = await runNodeCommand(["--conditions=react-server", "--import", "tsx", "-e", `
    for (const file of ["google-calendar", "google/oauth-service", "google/meeting-notes-link"]) require("./src/lib/" + file + ".ts");
    const services = [...new Set(Object.keys(require.cache).flatMap(file => {
      const normalized = file.split(require("node:path").sep).join("/");
      const servicePath = normalized.split("/googleapis/build/src/apis/")[1];
      return servicePath?.includes("/") ? [servicePath.split("/")[0]] : [];
    }))].sort();
    process.stdout.write(JSON.stringify(services));
  `], { env: { ...process.env, DATABASE_URL: "postgresql://test:test@localhost:1/test", NODE_ENV: "production" } });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(["calendar"]);
}, nodeCommandTestTimeout());
