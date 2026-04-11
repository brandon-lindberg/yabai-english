/**
 * Apply LLM-suggested fixes to items marked "bad" in placement-bank-llm-audit checkpoint.
 *
 * Requires: OPENAI_API_KEY (e.g. apps/web/.env)
 * Optional: OPENAI_MODEL (default gpt-5.4), PLACEMENT_LLM_FIX_BATCH (default 6)
 *
 * From apps/web:
 *   yarn placement-bank:llm-fix-bad
 *   yarn placement-bank:llm-fix-bad --dry-run --limit 6
 *   yarn placement-bank:llm-fix-bad --resume
 *
 * Reads:  data/placement-bank-llm-audit.checkpoint.jsonl
 * Writes: data/placement-bank/{A1|A2|B1|B2|C1}.json (in place)
 * Log:    data/placement-bank-llm-fix-bad.checkpoint.jsonl (one JSON line per fixed id, for --resume)
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { PLACEMENT_BANK_BANDS } from "../src/lib/placement-bank/constants";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";
import type { LoadedPlacementQuestion } from "../src/lib/placement-bank/load-placement-bank";
import {
  placementBankLevelFileSchema,
  type PlacementBankFile,
} from "../src/lib/placement-bank/schema";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const fixRowSchema = z.object({
  id: z.string().min(1),
  instructionEn: z.string().min(1),
  instructionJa: z.string().min(1),
  questionEn: z.string().min(1),
  questionJa: z.string().min(1),
  optionsEn: z.array(z.string()).length(3),
  optionsJa: z.array(z.string()).length(3),
  correctIndex: z.number().int().min(0).max(2),
});

const fixBatchResponseSchema = z.object({
  fixes: z.array(fixRowSchema),
});

type FixRow = z.infer<typeof fixRowSchema>;

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  let resume = false;
  let dryRun = false;
  let delayMs = 500;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i]!, 10);
    } else if (a === "--resume") {
      resume = true;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--delay-ms" && argv[i + 1]) {
      delayMs = Number.parseInt(argv[++i]!, 10);
    }
  }
  return { limit, resume, dryRun, delayMs };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tryLoadEnvFile(fp: string, override: boolean) {
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (override || process.env[k] === undefined) process.env[k] = v;
  }
}

function loadBadFromAuditCheckpoint(auditCheckpointPath: string): Map<string, string> {
  if (!fs.existsSync(auditCheckpointPath)) {
    throw new Error(`Missing audit checkpoint: ${auditCheckpointPath}`);
  }
  const byId = new Map<string, string>();
  for (const line of fs.readFileSync(auditCheckpointPath, "utf8").split("\n").filter(Boolean)) {
    try {
      const r = JSON.parse(line) as { id?: string; verdict?: string; reason?: string };
      if (!r.id || r.verdict !== "bad") continue;
      byId.set(r.id, (r.reason ?? "").trim());
    } catch {
      /* skip */
    }
  }
  return byId;
}

function loadFixedIds(fixLogPath: string): Set<string> {
  if (!fs.existsSync(fixLogPath)) return new Set();
  const ids = new Set<string>();
  for (const line of fs.readFileSync(fixLogPath, "utf8").split("\n").filter(Boolean)) {
    try {
      const r = JSON.parse(line) as { id?: string; status?: string };
      if (r.id && r.status === "fixed") ids.add(r.id);
    } catch {
      /* skip */
    }
  }
  return ids;
}

function toFixInput(q: LoadedPlacementQuestion, auditReason: string) {
  return {
    id: q.id,
    cefrBand: q.cefrBand,
    section: q.section,
    auditReason: auditReason || "(no reason given)",
    instructionEn: q.instructionEn,
    instructionJa: q.instructionJa,
    questionEn: q.questionEn,
    questionJa: q.questionJa,
    optionsEn: q.optionsEn,
    optionsJa: q.optionsJa,
    correctIndex: q.correctIndex,
  };
}

async function callOpenAIFixes(
  apiKey: string,
  model: string,
  batch: ReturnType<typeof toFixInput>[],
): Promise<FixRow[]> {
  const system = `You repair English placement test items for Japanese learners (CEFR A1–C1).

You receive JSON objects with: id, cefrBand, section, auditReason, and the current item fields
(instructionEn/Ja, questionEn/Ja, optionsEn[3], optionsJa[3], correctIndex).

For EACH input in order, output one object in "fixes" with the SAME id and corrected:
instructionEn, instructionJa, questionEn, questionJa, optionsEn (length 3), optionsJa (length 3), correctIndex (0–2).

Rules:
- Fix whatever made the item "bad" (see auditReason): contradictions, wrong keyed answer, invalid data (e.g. impossible clock times), instruction vs task mismatch, unnatural distractors.
- Keep difficulty appropriate to cefrBand and section (grammar / vocabulary / reading / functional).
- optionsJa[i] must be the natural Japanese rendering of optionsEn[i] (same order, same meaning).
- Do not change id. Do not add explanations outside JSON.

Respond with a single JSON object only, shape:
{"fixes":[{"id":"...","instructionEn":"...","instructionJa":"...","questionEn":"...","questionJa":"...","optionsEn":["","",""],"optionsJa":["","",""],"correctIndex":0}]}
The fixes array MUST have the same length and SAME ORDER as the input array.`;

  const user = JSON.stringify(batch);

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response missing message content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model returned non-JSON: ${content.slice(0, 300)}`);
  }

  const out = fixBatchResponseSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(`Invalid model JSON: ${out.error.message}\n${content.slice(0, 400)}`);
  }

  if (out.data.fixes.length !== batch.length) {
    throw new Error(`Expected ${batch.length} fixes, got ${out.data.fixes.length}`);
  }

  return out.data.fixes.map((row, i) => ({
    ...row,
    id: batch[i]!.id,
  }));
}

function applyFixesToDisk(
  webRoot: string,
  fixesById: Map<string, FixRow>,
  dryRun: boolean,
): { bandsTouched: Set<string> } {
  const bandsTouched = new Set<string>();
  for (const band of PLACEMENT_BANK_BANDS) {
    const fp = path.join(webRoot, "data", "placement-bank", `${band}.json`);
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = placementBankLevelFileSchema.parse(raw);
    let changed = false;
    const nextQuestions = parsed.questions.map((q: PlacementBankFile) => {
      const fix = fixesById.get(q.id);
      if (!fix) return q;
      changed = true;
      bandsTouched.add(band);
      return {
        ...q,
        instructionEn: fix.instructionEn,
        instructionJa: fix.instructionJa,
        questionEn: fix.questionEn,
        questionJa: fix.questionJa,
        optionsEn: fix.optionsEn,
        optionsJa: fix.optionsJa,
        correctIndex: fix.correctIndex,
      };
    });
    if (!changed) continue;
    const nextFile = { cefrBand: parsed.cefrBand, questions: nextQuestions };
    placementBankLevelFileSchema.parse(nextFile);
    if (!dryRun) {
      fs.writeFileSync(fp, `${JSON.stringify(nextFile, null, 2)}\n`, "utf8");
    }
  }
  return { bandsTouched };
}

async function main() {
  const webRoot = path.resolve(process.cwd());
  tryLoadEnvFile(path.join(webRoot, ".env"), false);
  tryLoadEnvFile(path.join(webRoot, ".env.local"), true);

  const { limit, resume, dryRun, delayMs } = parseArgs();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing OPENAI_API_KEY. Set it in apps/web/.env, then:\n  yarn placement-bank:llm-fix-bad",
    );
    process.exit(2);
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
  const batchSize = Number.parseInt(process.env.PLACEMENT_LLM_FIX_BATCH?.trim() || "6", 10);

  const dataDir = path.join(webRoot, "data");
  const auditCheckpoint = path.join(dataDir, "placement-bank-llm-audit.checkpoint.jsonl");
  const fixLogPath = path.join(dataDir, "placement-bank-llm-fix-bad.checkpoint.jsonl");

  const badMap = loadBadFromAuditCheckpoint(auditCheckpoint);
  let badIds = [...badMap.keys()].sort();
  if (resume) {
    const done = loadFixedIds(fixLogPath);
    badIds = badIds.filter((id) => !done.has(id));
  }
  if (limit != null && Number.isFinite(limit)) {
    badIds = badIds.slice(0, limit);
  }

  if (badIds.length === 0) {
    console.error("Nothing to fix (no bad rows, or all already in fix log with --resume).");
    process.exit(0);
  }

  const bank = loadPlacementBankSync(webRoot);
  const byId = new Map(bank.map((q) => [q.id, q] as const));
  const todo: LoadedPlacementQuestion[] = [];
  for (const id of badIds) {
    const q = byId.get(id);
    if (!q) {
      console.error(`Warning: bad id not in bank, skipping: ${id}`);
      continue;
    }
    todo.push(q);
  }

  console.error(
    `Model=${model} batch=${batchSize} dryRun=${dryRun} resume=${resume} items=${todo.length}`,
  );

  const batches: LoadedPlacementQuestion[][] = [];
  for (let i = 0; i < todo.length; i += batchSize) {
    batches.push(todo.slice(i, i + batchSize));
  }

  const allFixes = new Map<string, FixRow>();
  const bandsTouchedAll = new Set<string>();

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]!;
    const payload = batch.map((q) => toFixInput(q, badMap.get(q.id) ?? ""));
    let attempt = 0;
    let fixes: FixRow[] | null = null;
    while (attempt < 4) {
      try {
        fixes = await callOpenAIFixes(apiKey, model, payload);
        break;
      } catch (e) {
        attempt += 1;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("429") || msg.includes("503")) {
          console.error(`Rate limited / unavailable, backoff ${800 * attempt}ms (${attempt}/3)`);
          await sleep(800 * attempt);
        } else if (attempt >= 3) {
          throw e;
        } else {
          console.error(`Retry ${attempt}: ${msg.slice(0, 200)}`);
          await sleep(500 * attempt);
        }
      }
    }
    if (!fixes) throw new Error("No fixes after retries");

    const batchMap = new Map<string, FixRow>();
    for (const f of fixes) {
      allFixes.set(f.id, f);
      batchMap.set(f.id, f);
    }

    const { bandsTouched } = applyFixesToDisk(webRoot, batchMap, dryRun);
    for (const b of bandsTouched) bandsTouchedAll.add(b);

    if (!dryRun) {
      for (const f of fixes) {
        const line =
          JSON.stringify({ id: f.id, status: "fixed", at: new Date().toISOString() }) + "\n";
        fs.appendFileSync(fixLogPath, line, "utf8");
      }
    }

    console.error(`Batch ${bi + 1}/${batches.length} (${batch.length} items) OK`);
    if (bi < batches.length - 1) await sleep(delayMs);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    model,
    dryRun,
    fixedCount: allFixes.size,
    bandsTouched: [...bandsTouchedAll].sort(),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
