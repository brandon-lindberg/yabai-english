/**
 * Full LLM regeneration of the placement bank (2000 items) for maximum diversity.
 *
 * Design basis (prompt + comments; see also Council of Europe CEFR and common placement-test practice):
 * - Align items to CEFR "can-do" difficulty for the target band; vary micro-skills and scenarios.
 * - Contextualized tasks; plausible distractors; one unambiguous keyed answer.
 * - No template farming: each item must differ in situation, structure, and learning target from others.
 *
 * References (for maintainers):
 * - https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16802fc1bf
 * - https://www.cambridgeenglish.org/ (placement / teaching guides)
 *
 * Requires: OPENAI_API_KEY, apps/web as cwd
 * Optional: OPENAI_MODEL (default gpt-5.4), PLACEMENT_REGEN_BATCH (default 5)
 *
 * Safety: does nothing unless you pass --run (API calls). Add --write to persist JSON files.
 * Backup: full run copies the whole placement-bank folder. With --band <X>, only data/placement-bank/<X>.json
 *   is copied once to data/placement-bank-level-backups/<X>-<iso>.json (nothing else under placement-bank/ is read for backup).
 *
 *   yarn placement-bank:regenerate-llm --help
 *   yarn placement-bank:regenerate-llm --run --max-batches 2          # smoke: 2 batches API only
 *   yarn placement-bank:regenerate-llm --run                         # full API regen → checkpoint only
 *   yarn placement-bank:regenerate-llm --write                         # assemble JSON from checkpoint (no API)
 *   yarn placement-bank:regenerate-llm --run --write                   # full regen + write each band as it completes
 *   yarn placement-bank:regenerate-llm --run --write --resume          # continue API + write from checkpoint
 *
 * One level file at a time (separate checkpoint per band — safe to do A1, then A2, …):
 *   yarn placement-bank:regenerate-llm --band A1 --run [--write] [--resume]
 *   yarn placement-bank:regenerate-llm --band A2 --run [--write] [--resume]
 *   … then B1, B2, C1. Use --write when that band’s 80 batches are in its checkpoint, or use --run --write together.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  PLACEMENT_BANK_BANDS,
  PLACEMENT_BANK_SECTIONS,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
} from "../src/lib/placement-bank/constants";
import {
  placementBankBandSchema,
  placementBankFileSchema,
  placementBankLevelFileSchema,
  placementBankSectionSchema,
  type PlacementBankFile,
} from "../src/lib/placement-bank/schema";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const BAND_WEIGHT: Record<(typeof PLACEMENT_BANK_BANDS)[number], number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

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

function fingerprint(q: Pick<PlacementBankFile, "instructionEn" | "questionEn">): string {
  const a = q.instructionEn.replace(/\s+/g, " ").trim().slice(0, 100);
  const b = q.questionEn.replace(/\s+/g, " ").trim().slice(0, 160);
  return `${a} :: ${b}`;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`regenerate-placement-bank-llm.ts

  --run                 Call OpenAI (costs tokens). Without --run/--write, prints plan only.
  --write               Write level JSON from checkpoint (no API). With --band, merges partial checkpoint into existing {band}.json if the checkpoint is not yet complete; otherwise replaces from full checkpoint.
  --resume              Skip batches already present in the checkpoint file (with --run).
  --no-backup           Skip backup. With --band, default backup is only that level JSON (see script header).
  --max-batches N       Stop after N successful API batches (smoke test).
  --delay-ms M          Pause between batches (default 600).
  --band A1           Only this CEFR file (A1|A2|B1|B2|C1). Uses checkpoint data/placement-bank-regenerate-llm.<BAND>.checkpoint.jsonl so other bands are untouched.
`);
    process.exit(0);
  }
  let run = false;
  let write = false;
  let resume = false;
  let backup = true;
  let maxBatches: number | null = null;
  let delayMs = 600;
  let bandOnly: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--run") run = true;
    else if (a === "--write") write = true;
    else if (a === "--resume") resume = true;
    else if (a === "--no-backup") backup = false;
    else if (a === "--max-batches" && argv[i + 1]) maxBatches = Number.parseInt(argv[++i]!, 10);
    else if (a === "--delay-ms" && argv[i + 1]) delayMs = Number.parseInt(argv[++i]!, 10);
    else if (a === "--band" && argv[i + 1]) bandOnly = argv[++i]!.trim().toUpperCase();
    else if (a.startsWith("--band=")) bandOnly = a.slice("--band=".length).trim().toUpperCase();
  }
  if (bandOnly) placementBankBandSchema.parse(bandOnly);
  return { run, write, resume, backup, maxBatches, delayMs, bandOnly };
}

function checkpointPathFor(dataDir: string, bandOnly: string | null) {
  if (bandOnly) {
    return path.join(dataDir, `placement-bank-regenerate-llm.${bandOnly}.checkpoint.jsonl`);
  }
  return path.join(dataDir, "placement-bank-regenerate-llm.checkpoint.jsonl");
}

function batchKey(band: string, section: string, batchIndex: number) {
  return `${band}|${section}|${batchIndex}`;
}

function expectedIdsForBatch(
  band: string,
  section: string,
  batchIndex: number,
  batchSize: number,
): string[] {
  const start = batchIndex * batchSize + 1;
  const ids: string[] = [];
  for (let k = 0; k < batchSize; k++) {
    const n = start + k;
    if (n > PLACEMENT_QUESTIONS_PER_BAND_SECTION) break;
    ids.push(`pb-${band}-${section}-${String(n).padStart(3, "0")}`);
  }
  return ids;
}

function buildResearchSystemPreamble(): string {
  return `You are a senior assessment author for English placement tests used by Japanese learners.

Ground your work in established placement-test practice:
- Use the CEFR global scale: each item must clearly target ONE band’s typical “can-do” difficulty (not easier/harder than the label).
- Prefer contextualized, task-like prompts over decontextualized one-pattern drills.
- Multiple choice: exactly three options; distractors must be plausible at that level but clearly wrong; the keyed answer must be unambiguous.
- Avoid bias (fair, neutral situations); avoid trick questions; avoid relying on obscure cultural trivia.

Your top priority for THIS job: DIVERSITY. Items must not reuse the same scenario, same sentence frame, same micro-skill, or same “stem pattern” as one another. Light paraphrase of the same idea still counts as a duplicate and is forbidden across the batch and strongly discouraged vs the “avoid” list.`;
}

function sectionRubric(section: (typeof PLACEMENT_BANK_SECTIONS)[number], band: string): string {
  const b = band;
  switch (section) {
    case "grammar":
      return `grammar: assess morphology/syntax appropriate to ${b} (tense, agreement, word order, connectors, modality, etc.). Vary structures—do not repeat the same tense/person/pattern across items.`;
    case "vocabulary":
      return `vocabulary: collocation, word meaning in context, phrasal verbs, or lexis at ${b}. Each item must target different lemmas/themes than others in the batch and vs the avoid-list.`;
    case "reading":
      return `reading: include a SHORT English passage (2–5 sentences) in questionEn (and matching Japanese sense in questionJa where appropriate) OR embed the text clearly in the question; then ask comprehension, detail, inference, or purpose appropriate to ${b}. Each passage must be a different topic and genre.`;
    case "functional":
      return `functional: pragmatics—requests, apologies, complaints, suggestions, clarifications, meetings, email tone, etc., at ${b}. Each item a different situation and speech act.`;
    default:
      return section;
  }
}

function bandNuance(band: string): string {
  switch (band) {
    case "A1":
      return "A1: very simple everyday language; short sentences; basic facts/preferences; signs/messages.";
    case "A2":
      return "A2: routine matters; simple past/future; simple connected text; common situations.";
    case "B1":
      return "B1: main points; simple opinions/reasons; predictable work/study contexts.";
    case "B2":
      return "B2: abstract/specialized points; nuance; argument structure; formal/neutral register shifts.";
    case "C1":
      return "C1: implicit meaning; sophisticated cohesion; subtle stance; dense but fair texts.";
    default:
      return band;
  }
}

async function callOpenAIRegenBatch(params: {
  apiKey: string;
  model: string;
  band: string;
  section: string;
  batchIndex: number;
  expectedIds: string[];
  avoidSummaries: string[];
}): Promise<PlacementBankFile[]> {
  const { apiKey, model, band, section, batchIndex, expectedIds, avoidSummaries } = params;
  placementBankBandSchema.parse(band);
  const sectionParsed = placementBankSectionSchema.parse(section);

  const batchSize = expectedIds.length;
  const dynamicSchema = z.object({
    questions: z.array(placementBankFileSchema).length(batchSize),
  });

  const system = `${buildResearchSystemPreamble()}

Output JSON ONLY with shape: {"questions":[/* ${batchSize} objects */]}
Each object MUST match these fields exactly:
id, weight (integer 1–5), cefrBand, section, instructionEn, instructionJa, questionEn, questionJa,
optionsEn (3 strings), optionsJa (3 strings), correctIndex (0–2).
Do NOT include stemId unless you omit it (optional).

Fixed values for this batch:
- Every item: cefrBand must be "${band}", section must be "${section}".
- weight must be ${BAND_WEIGHT[band as keyof typeof BAND_WEIGHT]} for every item.
- ids MUST be exactly these strings in this order: ${JSON.stringify(expectedIds)}

${bandNuance(band)}

Section rubric: ${sectionRubric(sectionParsed, band)}

Japanese: instructionJa and questionJa must be natural for Japanese learners; optionsJa[i] must correspond to optionsEn[i] in meaning (same order).

DIVERSITY (mandatory):
- Within this batch of ${batchSize} items, no two items may share the same primary topic, setting, or grammar micro-focus.
- Do not reuse the same sentence frame with swapped words.

Avoid repeating or lightly rephrasing any of these prior fingerprints from this band+section (new content only):
${avoidSummaries.length ? avoidSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n") : "(none yet — still maximize variety.)"}`;

  const user = JSON.stringify({
    band,
    section,
    batchIndex,
    expectedIds,
    note: "Return only the JSON object with a questions array of the same length and order as expectedIds.",
  });

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 600)}`);
  }

  const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response missing message content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model returned non-JSON: ${content.slice(0, 400)}`);
  }

  const out = dynamicSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(`Invalid model JSON: ${out.error.message}\n${content.slice(0, 500)}`);
  }

  const questions = out.data.questions.map((q, i) => {
    const want = expectedIds[i]!;
    if (q.id !== want) {
      return { ...q, id: want };
    }
    return q;
  });

  for (const q of questions) {
    placementBankFileSchema.parse(q);
    if (q.cefrBand !== band || q.section !== section) {
      throw new Error(`Item ${q.id}: cefrBand/section mismatch`);
    }
    if (q.weight !== BAND_WEIGHT[band as keyof typeof BAND_WEIGHT]) {
      throw new Error(`Item ${q.id}: weight must be ${BAND_WEIGHT[band as keyof typeof BAND_WEIGHT]}`);
    }
  }

  return questions;
}

function loadCheckpoint(
  checkpointPath: string,
): Map<string, PlacementBankFile[]> {
  const m = new Map<string, PlacementBankFile[]>();
  if (!fs.existsSync(checkpointPath)) return m;
  for (const line of fs.readFileSync(checkpointPath, "utf8").split("\n").filter(Boolean)) {
    try {
      const row = JSON.parse(line) as { key?: string; questions?: PlacementBankFile[] };
      if (!row.key || !Array.isArray(row.questions)) continue;
      m.set(row.key, row.questions);
    } catch {
      /* skip */
    }
  }
  return m;
}

function appendCheckpoint(checkpointPath: string, key: string, questions: PlacementBankFile[]) {
  const line = JSON.stringify({ key, questions }) + "\n";
  fs.appendFileSync(checkpointPath, line, "utf8");
}

function assembleBandQuestions(
  band: string,
  checkpoint: Map<string, PlacementBankFile[]>,
  batchSize: number,
): PlacementBankFile[] {
  const byId = new Map<string, PlacementBankFile>();
  for (const section of PLACEMENT_BANK_SECTIONS) {
    const nBatches = Math.ceil(PLACEMENT_QUESTIONS_PER_BAND_SECTION / batchSize);
    for (let bi = 0; bi < nBatches; bi++) {
      const key = batchKey(band, section, bi);
      const chunk = checkpoint.get(key);
      if (!chunk) {
        throw new Error(`Missing checkpoint key ${key} (need full ${band} before write)`);
      }
      for (const q of chunk) {
        byId.set(q.id, q);
      }
    }
  }
  return orderBandQuestions(band, byId);
}

function orderBandQuestions(band: string, byId: Map<string, PlacementBankFile>): PlacementBankFile[] {
  const ordered: PlacementBankFile[] = [];
  for (const section of PLACEMENT_BANK_SECTIONS) {
    for (let i = 1; i <= PLACEMENT_QUESTIONS_PER_BAND_SECTION; i++) {
      const id = `pb-${band}-${section}-${String(i).padStart(3, "0")}`;
      const q = byId.get(id);
      if (!q) throw new Error(`Missing question ${id}`);
      ordered.push(q);
    }
  }
  return ordered;
}

/** Overlay checkpoint items onto an existing level file (partial regen → same 400 ids, some rows new). */
function mergeBandCheckpointOntoExisting(
  band: string,
  checkpoint: Map<string, PlacementBankFile[]>,
  existingPath: string,
): PlacementBankFile[] {
  const raw = JSON.parse(fs.readFileSync(existingPath, "utf8")) as unknown;
  const existing = placementBankLevelFileSchema.parse(raw);
  if (existing.cefrBand !== band) {
    throw new Error(`${existingPath}: cefrBand is "${existing.cefrBand}" but --band ${band}`);
  }
  const byId = new Map(existing.questions.map((q) => [q.id, q] as const));
  for (const [, chunk] of checkpoint) {
    for (const q of chunk) {
      if (!q.id.startsWith(`pb-${band}-`)) continue;
      byId.set(q.id, q);
    }
  }
  return orderBandQuestions(band, byId);
}

/** When --band is set, only that level file is backed up (under data/), never the whole placement-bank tree. */
function maybeBackupBeforeLevelWrite(
  webRoot: string,
  dataDir: string,
  bankDir: string,
  band: string,
  bandOnly: string | null,
  backup: boolean,
  wroteBackup: boolean,
): boolean {
  if (!backup || wroteBackup) return wroteBackup;
  const src = path.join(bankDir, `${band}.json`);
  if (!fs.existsSync(src)) return false;

  if (bandOnly) {
    const dir = path.join(dataDir, "placement-bank-level-backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(dir, `${band}-${stamp}.json`);
    fs.copyFileSync(src, dest);
    console.error(`Backed up ${path.relative(webRoot, src)} → ${path.relative(webRoot, dest)}`);
    return true;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(dataDir, `placement-bank.backup-${stamp}`);
  fs.cpSync(bankDir, dest, { recursive: true });
  console.error(`Backed up placement-bank to ${path.relative(webRoot, dest)}`);
  return true;
}

function assembleOrMergeBandForWrite(
  band: string,
  checkpoint: Map<string, PlacementBankFile[]>,
  batchSize: number,
  bankDir: string,
  allowMerge: boolean,
): { questions: PlacementBankFile[]; mode: "full-checkpoint" | "merged-into-existing" } {
  try {
    return { questions: assembleBandQuestions(band, checkpoint, batchSize), mode: "full-checkpoint" };
  } catch {
    const fp = path.join(bankDir, `${band}.json`);
    if (!allowMerge || !fs.existsSync(fp)) {
      throw new Error(
        `Checkpoint does not yet contain all batches for ${band}. Either finish --run (with --resume), or keep an existing ${band}.json and use --write again to merge partial LLM output into that file.`,
      );
    }
    return {
      questions: mergeBandCheckpointOntoExisting(band, checkpoint, fp),
      mode: "merged-into-existing",
    };
  }
}

async function main() {
  const webRoot = path.resolve(process.cwd());
  tryLoadEnvFile(path.join(webRoot, ".env"), false);
  tryLoadEnvFile(path.join(webRoot, ".env.local"), true);

  const { run, write, resume, backup, maxBatches, delayMs, bandOnly } = parseArgs();
  const dataDir = path.join(webRoot, "data");
  const bankDir = path.join(dataDir, "placement-bank");
  const checkpointPath = checkpointPathFor(dataDir, bandOnly);

  const bandsToRun = (
    bandOnly ? [bandOnly as (typeof PLACEMENT_BANK_BANDS)[number]] : [...PLACEMENT_BANK_BANDS]
  ) as readonly (typeof PLACEMENT_BANK_BANDS)[number][];

  const batchSize = Number.parseInt(process.env.PLACEMENT_REGEN_BATCH?.trim() || "5", 10);
  const batchesPerSection = Math.ceil(PLACEMENT_QUESTIONS_PER_BAND_SECTION / batchSize);
  const totalBatchesThisRun =
    bandsToRun.length * PLACEMENT_BANK_SECTIONS.length * batchesPerSection;

  console.error(
    bandOnly
      ? `Plan (--band ${bandOnly}): 1 file × ${PLACEMENT_BANK_SECTIONS.length} sections × ${batchesPerSection} batches × up to ${batchSize} items = ${totalBatchesThisRun} API batches (~${totalBatchesThisRun * batchSize} items). Checkpoint: ${path.basename(checkpointPath)}`
      : `Plan (all bands): ${PLACEMENT_BANK_BANDS.length} bands × ${PLACEMENT_BANK_SECTIONS.length} sections × ${batchesPerSection} batches × up to ${batchSize} items = ${totalBatchesThisRun} API batches (~${totalBatchesThisRun * batchSize} items max). Checkpoint: ${path.basename(checkpointPath)}`,
  );

  fs.mkdirSync(dataDir, { recursive: true });

  if (run && !resume && fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
  }

  const checkpoint = loadCheckpoint(checkpointPath);

  if (!run && write) {
    let wroteBackup = false;
    for (const band of bandsToRun) {
      const { questions: merged, mode: writeMode } = assembleOrMergeBandForWrite(
        band,
        checkpoint,
        batchSize,
        bankDir,
        Boolean(bandOnly),
      );
      const level = { cefrBand: band, questions: merged };
      placementBankLevelFileSchema.parse(level);
      console.error(`Write mode: ${writeMode}`);
      wroteBackup = maybeBackupBeforeLevelWrite(
        webRoot,
        dataDir,
        bankDir,
        band,
        bandOnly,
        backup,
        wroteBackup,
      );
      fs.mkdirSync(bankDir, { recursive: true });
      const fp = path.join(bankDir, `${band}.json`);
      fs.writeFileSync(fp, `${JSON.stringify(level, null, 2)}\n`, "utf8");
      console.error(`Wrote ${path.relative(webRoot, fp)}`);
    }
    console.log(
      JSON.stringify(
        { ok: true, mode: "assemble-write", bands: bandsToRun, checkpointPath: path.relative(webRoot, checkpointPath) },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (!run && !write) {
    console.error("Nothing to do: pass --run (API), --write (assemble JSON from checkpoint), or both. See --help.");
    process.exit(0);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in apps/web/.env");
    process.exit(2);
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";

  let batchesDone = 0;
  let wroteBackup = false;

  for (const band of bandsToRun) {
    const sectionFingerprints: Record<string, string[]> = {
      grammar: [],
      vocabulary: [],
      reading: [],
      functional: [],
    };

    for (const section of PLACEMENT_BANK_SECTIONS) {
      const nBatches = Math.ceil(PLACEMENT_QUESTIONS_PER_BAND_SECTION / batchSize);
      for (let bi = 0; bi < nBatches; bi++) {
        const key = batchKey(band, section, bi);
        if (resume && checkpoint.has(key)) {
          for (const q of checkpoint.get(key)!) {
            sectionFingerprints[section].push(fingerprint(q));
          }
          continue;
        }

        const expectedIds = expectedIdsForBatch(band, section, bi, batchSize);
        if (expectedIds.length === 0) continue;

        const avoid = sectionFingerprints[section].slice(-40);
        let attempt = 0;
        let questions: PlacementBankFile[] | null = null;
        while (attempt < 4) {
          try {
            questions = await callOpenAIRegenBatch({
              apiKey,
              model,
              band,
              section,
              batchIndex: bi,
              expectedIds,
              avoidSummaries: avoid,
            });
            break;
          } catch (e) {
            attempt += 1;
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("429") || msg.includes("503")) {
              console.error(`429/503 backoff ${900 * attempt}ms`);
              await sleep(900 * attempt);
            } else if (attempt >= 3) {
              throw e;
            } else {
              console.error(`Retry ${attempt}: ${msg.slice(0, 220)}`);
              await sleep(600 * attempt);
            }
          }
        }
        if (!questions) throw new Error("No questions after retries");

        appendCheckpoint(checkpointPath, key, questions);
        checkpoint.set(key, questions);
        for (const q of questions) {
          sectionFingerprints[section].push(fingerprint(q));
        }

        if (write && bandOnly === band) {
          const levelPath = path.join(bankDir, `${band}.json`);
          if (fs.existsSync(levelPath)) {
            try {
              const merged = mergeBandCheckpointOntoExisting(band, checkpoint, levelPath);
              const level = { cefrBand: band, questions: merged };
              placementBankLevelFileSchema.parse(level);
              wroteBackup = maybeBackupBeforeLevelWrite(
                webRoot,
                dataDir,
                bankDir,
                band,
                bandOnly,
                backup,
                wroteBackup,
              );
              fs.mkdirSync(bankDir, { recursive: true });
              fs.writeFileSync(levelPath, `${JSON.stringify(level, null, 2)}\n`, "utf8");
              console.error(
                `Merged checkpoint into ${path.relative(webRoot, levelPath)} (partial progress; other ids unchanged).`,
              );
            } catch (e) {
              console.error(
                `Incremental merge-write skipped: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
        }

        batchesDone += 1;
        console.error(`OK batch ${batchesDone} ${key} (${questions.length} items) model=${model}`);

        if (maxBatches != null && batchesDone >= maxBatches) {
          console.error(`--max-batches ${maxBatches} reached; stopping early.`);
          if (!write) {
            console.error(
              bandOnly
                ? `Checkpoint updated; when this band is complete run: yarn placement-bank:regenerate-llm --band ${bandOnly} --write`
                : "Checkpoint updated; pass --write after completing all batches to save JSON.",
            );
            process.exit(0);
          }
          console.error(
            bandOnly
              ? `Cannot --write until all batches for ${bandOnly} exist in checkpoint. Re-run with --run --write --resume --band ${bandOnly}.`
              : "Cannot --write until every batch for each band exists. Re-run with --resume to continue.",
          );
          process.exit(0);
        }

        await sleep(delayMs);
      }
    }

    if (!write) continue;

    let merged: PlacementBankFile[];
    let writeMode: "full-checkpoint" | "merged-into-existing";
    try {
      const out = assembleOrMergeBandForWrite(band, checkpoint, batchSize, bankDir, Boolean(bandOnly));
      merged = out.questions;
      writeMode = out.mode;
    } catch (e) {
      console.error(`Band ${band} not ready for write: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    console.error(`Write mode: ${writeMode}`);
    const level = { cefrBand: band, questions: merged };
    placementBankLevelFileSchema.parse(level);

    wroteBackup = maybeBackupBeforeLevelWrite(
      webRoot,
      dataDir,
      bankDir,
      band,
      bandOnly,
      backup,
      wroteBackup,
    );

    fs.mkdirSync(bankDir, { recursive: true });
    const fp = path.join(bankDir, `${band}.json`);
    fs.writeFileSync(fp, `${JSON.stringify(level, null, 2)}\n`, "utf8");
    console.error(`Wrote ${path.relative(webRoot, fp)}`);
  }

  if (write) {
    for (const band of bandsToRun) {
      try {
        assembleOrMergeBandForWrite(band, checkpoint, batchSize, bankDir, Boolean(bandOnly));
      } catch (e) {
        console.error(String(e));
        process.exit(1);
      }
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          model,
          batchesDone,
          bands: bandsToRun,
          checkpointPath: path.relative(webRoot, checkpointPath),
        },
        null,
        2,
      ),
    );
  } else {
    const writeHint = bandOnly
      ? `yarn placement-bank:regenerate-llm --band ${bandOnly} --write`
      : "yarn placement-bank:regenerate-llm --write";
    console.error(
      `Done API batches (--run) but not --write: checkpoint updated. When complete, run: ${writeHint}   (or use --run --write --resume to continue and write each band as it finishes).`,
    );
    console.log(JSON.stringify({ ok: true, model, batchesDone, wroteFiles: false }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
