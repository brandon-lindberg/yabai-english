/**
 * Generate Beginner Level 1 flashcard JSON (decks + cards + exit assessment) via OpenAI.
 *
 * Requires: OPENAI_API_KEY (e.g. apps/web/.env)
 * Optional: OPENAI_MODEL (default gpt-5.4)
 *
 * From apps/web:
 *   yarn study:generate-beginner-1 --run --write   # call API and overwrite data/study/beginner-1.json
 *   yarn study:generate-beginner-1               # print plan only
 */
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import { beginnerLevelFileSchema, llmBeginnerLevelResponseSchema } from "../src/lib/study/schemas";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OUT_FILE = path.join(__dirname, "../data/study/beginner-1.json");

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

function parseArgs() {
  const argv = process.argv.slice(2);
  let run = false;
  let write = false;
  for (const a of argv) {
    if (a === "--run") run = true;
    if (a === "--write") write = true;
  }
  return { run, write };
}

function assignIds(parsed: ReturnType<typeof llmBeginnerLevelResponseSchema.parse>) {
  const decks = parsed.decks.map((deck, di) => ({
    id: `study-b1-deck-${di}`,
    titleJa: deck.titleJa,
    titleEn: deck.titleEn,
    sortOrder: deck.sortOrder,
    cards: deck.cards.map((card, ci) => ({
      id: `study-b1-d${di}-c${ci}`,
      frontJa: card.frontJa,
      backEn: card.backEn,
      sortOrder: card.sortOrder,
    })),
  }));

  const items = parsed.assessment.items.map((item, i) => ({
    ...item,
    id: item.id?.trim() ? item.id : `study-b1-a${i}`,
  }));

  return beginnerLevelFileSchema.parse({
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_1,
    decks,
    assessment: {
      passingScore: parsed.assessment.passingScore,
      items,
    },
  });
}

async function callOpenAI(apiKey: string, model: string) {
  const system = `You are an expert English teacher for Japanese learners (CEFR A1 / Beginner 1).

Return ONE JSON object only (no markdown) with this exact shape:
{
  "decks": [
    {
      "titleJa": string,
      "titleEn": string,
      "sortOrder": number (0,1,2,...),
      "cards": [
        { "frontJa": string (Japanese word or phrase to recall), "backEn": string (English meaning), "sortOrder": number }
      ]
    }
  ],
  "assessment": {
    "passingScore": number (60-80 recommended, percent correct to pass),
    "items": [
      {
        "id": string (optional, unique),
        "promptJa": string,
        "promptEn": string,
        "options": string[] (3-4 choices in English),
        "correctIndex": number (0-based)
      }
    ]
  }
}

Rules:
- Exactly 3 decks: greetings; basic words (yes/no, water, food, I/you/this/that); numbers 1-10 in Japanese reading → English number names.
- Each deck: 8-12 cards. frontJa is Japanese (or Arabic numerals where appropriate for numbers); backEn is clear English.
- Assessment: exactly 5 MCQ items testing the same vocabulary (no trick questions).
- Keep vocabulary strictly beginner survival / A1 level.`;

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
        {
          role: "user",
          content: "Generate the full JSON for Beginner Level 1 as specified.",
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 500)}`);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const raw = JSON.parse(content) as unknown;
  const llmParsed = llmBeginnerLevelResponseSchema.safeParse(raw);
  if (!llmParsed.success) {
    console.error(llmParsed.error.flatten());
    throw new Error("LLM JSON failed schema validation");
  }
  return assignIds(llmParsed.data);
}

async function main() {
  tryLoadEnvFile(path.join(__dirname, "../.env"), false);
  const { run, write } = parseArgs();

  if (!run && !write) {
    console.log(
      "Plan: with OPENAI_API_KEY set, run: yarn study:generate-beginner-1 --run --write\n" +
        `Output: ${OUT_FILE}`,
    );
    return;
  }

  if (write && !run) {
    console.error("Use --run --write together (or --run only to validate without write).");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";

  const validated = await callOpenAI(apiKey, model);

  if (write) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    console.log(`Wrote ${OUT_FILE}`);
  } else {
    console.log(JSON.stringify(validated, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
