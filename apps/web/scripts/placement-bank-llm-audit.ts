/**
 * Semantic (LLM) audit of the placement bank: each item judged good/bad for Q + keyed answer.
 *
 * Requires: OPENAI_API_KEY in environment (e.g. apps/web/.env)
 * Optional: OPENAI_MODEL (default gpt-5.4), PLACEMENT_LLM_BATCH (default 12)
 *
 * From apps/web:
 *   yarn placement-bank:llm-audit
 *   yarn placement-bank:llm-audit --limit 36           # smoke test (3 batches of 12)
 *   yarn placement-bank:llm-audit --resume             # skip ids already in checkpoint
 *
 * Outputs:
 *   data/placement-bank-llm-audit.checkpoint.jsonl  (append one line per item)
 *   data/placement-bank-llm-audit.summary.json      (final counts + bad list)
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";
import type { LoadedPlacementQuestion } from "../src/lib/placement-bank/load-placement-bank";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const resultRowSchema = z.object({
  id: z.string(),
  verdict: z.enum(["good", "bad"]),
  reason: z.string().optional(),
});

const batchResponseSchema = z.object({
  results: z.array(resultRowSchema),
});

type ResultRow = z.infer<typeof resultRowSchema>;

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  let resume = false;
  let delayMs = 400;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i]!, 10);
    } else if (a === "--resume") {
      resume = true;
    } else if (a === "--delay-ms" && argv[i + 1]) {
      delayMs = Number.parseInt(argv[++i]!, 10);
    }
  }
  return { limit, resume, delayMs };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toBatchPayload(q: LoadedPlacementQuestion) {
  return {
    id: q.id,
    section: q.section,
    cefrBand: q.cefrBand,
    instructionEn: q.instructionEn,
    questionEn: q.questionEn,
    optionsEn: q.optionsEn,
    correctIndex: q.correctIndex,
  };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  batch: ReturnType<typeof toBatchPayload>[],
): Promise<ResultRow[]> {
  const system = `You are an expert English teacher and test item reviewer for CEFR placement (A1–C1).

For EACH item in the user JSON array, judge:
1) Does the instruction + question together form a coherent, sensible task for a learner?
2) Is the option at optionsEn[correctIndex] clearly the correct or best answer for that task (grammar, vocabulary, reading, or functional English as appropriate)?

Rules:
- Verdict "good" if both are acceptable. Minor stiffness or simple templates are still "good".
- Verdict "bad" if the prompt is nonsensical, broken, or self-contradictory, OR if the keyed answer is wrong, unnatural for the blank, or clearly not the best option.
- For reading/inference items, allow correct answers that paraphrase the passage if they are still clearly supported.

You MUST respond with a single JSON object only, shape:
{"results":[{"id":"<same as input>","verdict":"good"|"bad","reason":"<empty string if good, else one short sentence>"}]}
The results array MUST have the same length and the SAME ORDER as the input array. Every input id must appear exactly once.`;

  const user = JSON.stringify(batch);

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
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

  const out = batchResponseSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(`Invalid model JSON: ${out.error.message}\n${content.slice(0, 400)}`);
  }

  if (out.data.results.length !== batch.length) {
    throw new Error(`Expected ${batch.length} results, got ${out.data.results.length}`);
  }

  // Repair id mismatches by position if model echoed wrong id (keep verdict/reason)
  return out.data.results.map((r, i) => ({
    ...r,
    id: batch[i]!.id,
  }));
}

function loadCheckpointIds(checkpointPath: string): Set<string> {
  if (!fs.existsSync(checkpointPath)) return new Set();
  const lines = fs.readFileSync(checkpointPath, "utf8").trim().split("\n").filter(Boolean);
  const ids = new Set<string>();
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as { id?: string };
      if (row.id) ids.add(row.id);
    } catch {
      /* skip */
    }
  }
  return ids;
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

async function main() {
  const webRoot = path.resolve(process.cwd());
  tryLoadEnvFile(path.join(webRoot, ".env"), false);
  tryLoadEnvFile(path.join(webRoot, ".env.local"), true);

  const { limit, resume, delayMs } = parseArgs();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing OPENAI_API_KEY. Set it in apps/web/.env (or export in shell), then re-run:\n  yarn placement-bank:llm-audit",
    );
    process.exit(2);
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
  const batchSize = Number.parseInt(process.env.PLACEMENT_LLM_BATCH?.trim() || "12", 10);

  const dataDir = path.join(webRoot, "data");
  const checkpointPath = path.join(dataDir, "placement-bank-llm-audit.checkpoint.jsonl");
  const summaryPath = path.join(dataDir, "placement-bank-llm-audit.summary.json");

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const bank = loadPlacementBankSync(webRoot);
  const done = resume ? loadCheckpointIds(checkpointPath) : new Set<string>();

  let todo = bank.filter((q) => !done.has(q.id));
  if (limit != null && Number.isFinite(limit)) {
    todo = todo.slice(0, limit);
  }

  console.error(`Model=${model} batch=${batchSize} items=${todo.length} resume=${resume}`);

  const batches: LoadedPlacementQuestion[][] = [];
  for (let i = 0; i < todo.length; i += batchSize) {
    batches.push(todo.slice(i, i + batchSize));
  }

  let good = 0;
  let bad = 0;
  const badRows: ResultRow[] = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]!;
    const payload = batch.map(toBatchPayload);
    let attempt = 0;
    let results: ResultRow[] | null = null;
    while (attempt < 4) {
      try {
        results = await callOpenAI(apiKey, model, payload);
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
    if (!results) throw new Error("No results after retries");

    for (const row of results) {
      const line = JSON.stringify(row) + "\n";
      fs.appendFileSync(checkpointPath, line, "utf8");
      if (row.verdict === "good") good += 1;
      else {
        bad += 1;
        badRows.push(row);
      }
    }

    console.error(`Batch ${bi + 1}/${batches.length} (${batch.length} items) OK`);
    if (bi < batches.length - 1) await sleep(delayMs);
  }

  const byId = new Map<string, ResultRow>();
  if (fs.existsSync(checkpointPath)) {
    for (const line of fs.readFileSync(checkpointPath, "utf8").split("\n").filter(Boolean)) {
      try {
        const r = JSON.parse(line) as ResultRow;
        byId.set(r.id, r);
      } catch {
        /* skip */
      }
    }
  }
  let goodAll = 0;
  let badAll = 0;
  const badAllRows: ResultRow[] = [];
  for (const r of byId.values()) {
    if (r.verdict === "good") goodAll += 1;
    else {
      badAll += 1;
      badAllRows.push(r);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    model,
    batchSize,
    evaluatedThisRun: todo.length,
    totalInBank: bank.length,
    uniqueIdsInCheckpoint: byId.size,
    checkpointPath: path.relative(webRoot, checkpointPath),
    countsThisRun: { good, bad },
    cumulativeFromCheckpoint: { good: goodAll, bad: badAll },
    badSamplesLatestRun: badRows.slice(0, 50),
    badSamplesCumulative: badAllRows.slice(0, 80),
  };

  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
