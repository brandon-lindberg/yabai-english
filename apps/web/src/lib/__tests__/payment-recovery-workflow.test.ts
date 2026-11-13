import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import { nodeCommandTestTimeout, runTestCommand } from "../../../test/node-command";

const yaml = createRequire(import.meta.url)("js-yaml") as { load(source: string): unknown };
type Workflow = {
  on: { schedule: Array<{ cron: string }>; workflow_dispatch: unknown };
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: { recover: { if: string; "runs-on": string; "timeout-minutes": number;
    steps: Array<{ name: string; run: string; env: Record<string, string>; uses?: string }> } };
};
const loadWorkflow = async () => yaml.load(await readFile(new URL("../../../../../.github/workflows/payment-recovery.yml", import.meta.url), "utf8")) as Workflow;
const repository = "brandon-lindberg/yabai-english";
const secret = "scheduler-test-secret";

async function runWorkflow({ status = "200", exit = "0", token = secret } = {}) {
  const workflow = await loadWorkflow();
  const step = workflow.jobs.recover.steps[0];
  const directory = await mkdtemp(join(tmpdir(), "payment-recovery-workflow-"));
  try {
    const bin = join(directory, "bin"), captured = join(directory, "calls.jsonl");
    await mkdir(bin);
    // Execute the actual workflow shell with a local curl stand-in. No network or provider calls.
    await writeFile(join(bin, "curl"), `#!${process.execPath}\nconst fs = require('node:fs');\nfs.appendFileSync(process.env.CURL_CAPTURE, JSON.stringify(process.argv.slice(2)) + '\\n');\nprocess.stdout.write(process.env.CURL_STATUS);\nprocess.exitCode = Number(process.env.CURL_EXIT);\n`, { mode: 0o755 });
    const result = await runTestCommand("/bin/bash", ["-e", "-u", "-o", "pipefail", "-c", step.run], {
      cwd: directory, env: { ...process.env, ...step.env, PAYMENT_RECOVERY_SECRET: token,
        PATH: `${bin}:${process.env.PATH}`, CURL_CAPTURE: captured, CURL_STATUS: status, CURL_EXIT: exit },
    });
    const calls = await readFile(captured, "utf8").then(data => data.trim().split("\n").map(line => JSON.parse(line) as string[]), () => []);
    return { ...result, calls, workflow };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

describe("production payment recovery schedule", { timeout: nodeCommandTestTimeout() }, () => {
  test("runs at fifteen-minute intervals and only accepts schedule or explicit manual triggers", async () => {
    const workflow = await loadWorkflow();
    expect(Object.keys(workflow.on).sort()).toEqual(["schedule", "workflow_dispatch"]);
    expect(workflow.on.schedule).toHaveLength(1);
    const [minutes, ...rest] = workflow.on.schedule[0].cron.split(" ");
    expect(rest).toEqual(["*", "*", "*", "*"]);
    const times = minutes.split(",").map(Number).sort((a, b) => a - b);
    expect(times).toHaveLength(4);
    expect(times.every(minute => Number.isInteger(minute) && minute >= 0 && minute < 60)).toBe(true);
    expect(times.map((minute, i) => ((times[(i + 1) % 4] - minute) + 60) % 60)).toEqual([15, 15, 15, 15]);
  });

  test.each([
    ["schedule", "", "master", repository, false],
    ["schedule", "false", "master", repository, false],
    ["schedule", "true", "master", repository, true],
    ["workflow_dispatch", "", "master", repository, true],
    ["workflow_dispatch", "false", "master", repository, true],
    ["schedule", "true", "the-mirror", repository, false],
    ["workflow_dispatch", "true", "the-mirror", repository, false],
    ["schedule", "true", "master", "someone/fork", false],
    ["pull_request", "true", "master", repository, false],
  ] as const)("enforces activation and production ownership (%s, enabled=%s, branch=%s, repo=%s)", async (event, enabled, branch, repo, expected) => {
    const workflow = await loadWorkflow();
    // This guard deliberately uses only property access, equality and boolean operators shared with JS.
    expect(runInNewContext(workflow.jobs.recover.if, {
      github: { event_name: event, ref: `refs/heads/${branch}`, repository: repo },
      vars: { PAYMENT_RECOVERY_ENABLED: enabled },
    }, { timeout: 100 })).toBe(expected);
  });

  test("needs no repository token, application checkout or dependency installation and cannot overlap runs", async () => {
    const workflow = await loadWorkflow();
    expect(workflow.permissions).toEqual({});
    expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
    expect(workflow.concurrency.group).toBeTruthy();
    expect(workflow.jobs.recover["runs-on"]).toBe("ubuntu-24.04");
    expect(workflow.jobs.recover.steps).toHaveLength(1);
    expect(workflow.jobs.recover.steps[0].uses).toBeUndefined();
    expect(workflow.jobs.recover.steps[0].env.PAYMENT_RECOVERY_SECRET).toBe("${{ secrets.PAYMENT_RECOVERY_SECRET }}");
  });

  test("makes one bounded authenticated POST, discards financial response data and does not log the secret", async () => {
    const result = await runWorkflow();
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toHaveLength(1);
    const args = result.calls[0];
    const value = (flag: string) => args[args.indexOf(flag) + 1];
    expect(value("--request")).toBe("POST");
    expect(value("--header")).toBe(`Authorization: Bearer ${secret}`);
    expect(value("--url")).toBe("https://www.englishstudiojapan.com/api/internal/payments/recover");
    expect(value("--output")).toBe("/dev/null");
    expect(value("--proto")).toBe("=https");
    expect(Number(value("--connect-timeout"))).toBeGreaterThan(0);
    expect(Number(value("--max-time"))).toBeGreaterThan(300);
    expect(Number(value("--max-time"))).toBeLessThan(result.workflow.jobs.recover["timeout-minutes"] * 60);
    expect(args).not.toContain("--location");
    expect(args).not.toContain("--retry");
    expect(result.stdout + result.stderr).not.toContain(secret);
  });

  test("a missing secret fails before any request", async () => {
    const result = await runWorkflow({ token: "" });
    expect(result.status).not.toBe(0);
    expect(result.calls).toEqual([]);
    expect(result.stdout + result.stderr).toContain("PAYMENT_RECOVERY_SECRET");
  });

  test.each(["201", "204", "301", "302", "401", "403", "404", "500", "503"])("rejects HTTP %s without following redirects or exposing credentials", async status => {
    const result = await runWorkflow({ status });
    expect(result.status).not.toBe(0);
    expect(result.calls).toHaveLength(1);
    expect(result.stdout + result.stderr).toContain(status);
    expect(result.stdout + result.stderr).not.toContain(secret);
  });

  test("network timeouts fail without immediate repeated calls", async () => {
    const result = await runWorkflow({ status: "000", exit: "28" });
    expect(result.status).not.toBe(0);
    expect(result.calls).toHaveLength(1);
    expect(result.stdout + result.stderr).not.toContain(secret);
  });
});
