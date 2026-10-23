import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { loadContentCatalog } from "../src/lib/japanese-placement/content-files";
import { buildContentBank } from "../src/lib/japanese-placement/content-pack";
import { createJapanesePilotForms, inspectJapanesePilot, projectJapanesePilotForm } from "../src/lib/japanese-placement/pilot";

const usage = [
  "Usage: japanese-placement:pilot forms",
  "       japanese-placement:pilot form --forms FILE --id FORM_ID",
  "       japanese-placement:pilot diagnose --forms FILE --data FILE",
].join("\n");

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "--help" && !args.length) { process.stdout.write(`${usage}\n`); return; }
  if (!["forms", "form", "diagnose"].includes(command)) throw new Error(usage);
  const allowed = command === "forms" ? [] : command === "form" ? ["--forms", "--id"] : ["--forms", "--data"];
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!allowed.includes(flag) || !value || value.startsWith("--")) throw new Error(`Invalid argument.\n${usage}`);
    if (options.has(flag)) throw new Error(`Duplicate argument: ${flag}`);
    options.set(flag, value);
  }
  if (allowed.some((flag) => !options.has(flag))) throw new Error(`Command requires ${allowed.join(" and ")}.\n${usage}`);
  const bank = buildContentBank((await loadContentCatalog(resolve("data/japanese-placement"))).pack);
  const readJson = async (file: string): Promise<unknown> => {
    const contents = await readFile(resolve(file), "utf8");
    try { return JSON.parse(contents); } catch { throw new Error("Invalid JSON input file"); }
  };
  const forms = command === "forms" ? createJapanesePilotForms(bank) : await readJson(options.get("--forms")!);
  const result = command === "forms" ? forms : command === "form"
    ? projectJapanesePilotForm(bank, forms, options.get("--id")!)
    : inspectJapanesePilot(bank, forms, await readJson(options.get("--data")!));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  // Schema failures must not echo participant-supplied values into terminal logs.
  process.stderr.write(`${error instanceof ZodError ? "Invalid Japanese pilot input schema" : error instanceof Error ? error.message : "Japanese pilot command failed"}\n`);
  process.exitCode = 1;
});
