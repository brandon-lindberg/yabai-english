import { execFile, type ExecFileException } from "node:child_process";

export const NODE_COMMAND_TIMEOUT_MS = 10_000;

export const nodeCommandTestTimeout = (commands = 1) => commands * NODE_COMMAND_TIMEOUT_MS + 5_000;

type CommandOptions = { timeout?: number; env?: NodeJS.ProcessEnv; cwd?: string };
type CommandResult = { status: number | null; stdout: string; stderr: string; signal: string | null; error: ExecFileException | null };

/** Keep Vitest's timers/RPC responsive and resolve only after the child closes. */
export function runNodeCommand(args: string[], options: CommandOptions = {}): Promise<CommandResult> {
  const timeout = options.timeout ?? NODE_COMMAND_TIMEOUT_MS;
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error("A finite command deadline is required");
  return new Promise((resolve) => {
    let expired = false;
    let forceStop: ReturnType<typeof setTimeout> | undefined;
    const child = execFile(process.execPath, args, {
      encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options, timeout: 0,
    }, (error, stdout, stderr) => {
      clearTimeout(deadline);
      clearTimeout(forceStop);
      const failure = expired ? Object.assign(error ?? new Error("Test command timed out"), { code: "ETIMEDOUT" }) : error;
      resolve({ status: failure ? typeof failure.code === "number" ? failure.code : null : 0, stdout, stderr, signal: error?.signal ?? null, error: failure });
    });
    const deadline = setTimeout(() => {
      expired = true;
      child.kill("SIGTERM");
      // Allow cleanup, then ensure a stuck child cannot keep a failed test alive.
      forceStop = setTimeout(() => child.kill("SIGKILL"), 250);
    }, timeout);
  });
}

export const runServerScript = (script: string, args: string[] = [], options?: CommandOptions) =>
  runNodeCommand(["--conditions=react-server", "--import", "tsx", script, ...args], options);
