import { setImmediate } from "node:timers/promises";
import { describe, expect, test } from "vitest";
import { runNodeCommand } from "../../../test/node-command";

describe("test CLI process lifecycle", () => {
  test("keeps the worker responsive while a command is running", async () => {
    let settled = false;
    const command = runNodeCommand(["-e", "setTimeout(() => process.stdout.write('finished'), 250)"])
      .then(result => { settled = true; return result; });
    await setImmediate();
    const settledBeforeYield = settled;
    const result = await command;
    expect(settledBeforeYield).toBe(false);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("finished");
  });

  test("preserves nonzero exit status and both output streams", async () => {
    const result = await runNodeCommand(["-e", "process.stdout.write('output'); process.stderr.write('failure'); process.exitCode = 3;"]);
    expect(result.status).toBe(3);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("failure");
  });

  test("terminates a stuck command and waits for its process to exit", async () => {
    const result = await runNodeCommand(["-e", "process.on('SIGTERM', () => {}); process.stdout.write(String(process.pid)); setInterval(() => {}, 1000);"], { timeout: 1_000 });
    expect(result.status).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.signal).toBe("SIGKILL");
    const pid = Number(result.stdout);
    expect(pid).toBeGreaterThan(0);
    expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: "ESRCH" }));
  });

  test("allows the child to shut down gracefully at its deadline", async () => {
    const result = await runNodeCommand(["-e", "process.on('SIGTERM', () => { process.stderr.write('closed'); process.exit(0); }); setInterval(() => {}, 1000);"], { timeout: 1_000 });
    expect(result.error).toBeDefined();
    expect(result.stderr).toBe("closed");
    expect(result.signal).toBeNull();
  });
});
