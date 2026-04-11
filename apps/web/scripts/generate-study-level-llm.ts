/**
 * Optional: regenerate Beginner Level 1 JSON via OpenAI (gpt-5.4 by default).
 * Default workflow in this repo is the curated template: `yarn study:build-beginner1-json`.
 *
 * Requires: OPENAI_API_KEY (apps/web/.env)
 * Optional: OPENAI_MODEL (default gpt-5.4)
 *
 * From repo root or apps/web:
 *   yarn study:generate-beginner-1 --run --write   # overwrite data/study/beginner-1.json
 *   yarn study:generate-beginner-1                 # print plan only
 */
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import { beginnerLevelFileSchema, llmBeginnerLevelResponseSchema } from "../src/lib/study/schemas";
import { studyPromptAuthoringGuideline } from "../src/lib/study/prompt-locale-policy";

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

const CURRICULUM_SPEC = `
Learner goal: "I can understand and say very basic things" (CEFR A1 / Beginner 1).

Produce exactly 8 to 10 decks in this order (merge or split only if needed to stay within deck count; keep topic focus):
1. Greetings & Politeness — hello, good morning, thank you, sorry, please, goodbye, etc.
2. Basic Pronouns — I, you, he, she, we, they (natural Japanese cues → English pronouns).
3. To Be (am / is / are) — short patterns: I am a student, She is happy, etc. (Japanese prompt → English sentence).
4. Numbers 1–20 — Japanese readings / forms → English number words.
5. Basic Nouns (Everyday Objects) — book, pen, phone, water, bag, desk, etc.
6. Basic Verbs — eat, drink, go, see, like, read, write, etc. (Japanese → English verb).
7. Simple Sentences — e.g. I eat rice, I like dogs (Japanese → natural English).
8. Yes / No Questions — e.g. Are you happy? Do you like sushi? (Japanese question → English question).
9. Classroom English — repeat, listen, write, read, open your book, etc.

Each deck: 10 to 15 flashcards. Total cards across all decks: 100 to 120 (hard cap 125).

Card format:
- frontJa: Japanese (or number in Japanese style where appropriate). Keep A1-simple; one clear recall target per card.
- backEn: clear English answer (word, phrase, or short sentence). No romaji-only backs.

Exit assessment:
- 10 to 14 multiple-choice items drawn from the same vocabulary and patterns (mix of recognition and short production-style choices).
- passingScore: integer 60–75 (percent correct to pass).

Diversity: avoid duplicate backs; vary situations slightly; distractors in assessment must be plausible for the level.

Track-wide locale policy (this level):
${studyPromptAuthoringGuideline(StudyLevelCode.BEGINNER_1)}
`.trim();

async function callOpenAI(apiKey: string, model: string) {
  const system = `You are an expert curriculum author for Japanese learners studying English (Beginner Level 1 / A1).

Return ONE JSON object only (no markdown, no code fences) with this exact shape:
{
  "decks": [
    {
      "titleJa": string,
      "titleEn": string,
      "sortOrder": number,
      "cards": [
        { "frontJa": string, "backEn": string, "sortOrder": number }
      ]
    }
  ],
  "assessment": {
    "passingScore": number,
    "items": [
      {
        "id": string (optional),
        "promptJa": string,
        "promptEn": string,
        "options": string[] (exactly 4 English strings),
        "correctIndex": number (0-3)
      }
    ]
  }
}

Hard requirements:
- decks.length MUST be between 8 and 10 inclusive.
- Every deck MUST have between 10 and 15 cards inclusive.
- Sum of all cards MUST be between 100 and 120 inclusive (never above 125).
- assessment.items.length MUST be between 10 and 14 inclusive.
- sortOrder for decks: 0,1,2,... in order. sortOrder for cards within each deck: 0,1,2,...

Curriculum specification:
${CURRICULUM_SPEC}`;

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
          content:
            "Generate the complete Beginner Level 1 JSON now. Meet every numeric constraint exactly.",
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
  // Prefer values from apps/web/.env so a stale global OPENAI_API_KEY does not shadow the project file.
  tryLoadEnvFile(path.join(__dirname, "../.env"), true);
  const { run, write } = parseArgs();

  if (!run && !write) {
    console.log(
      "Optional OpenAI Beginner L1 generator.\n" +
        "Curated bank (no API): yarn study:build-beginner1-json\n" +
        "With OPENAI_API_KEY: yarn study:generate-beginner-1 --run --write\n" +
        `Output: ${OUT_FILE}`,
    );
    return;
  }

  if (write && !run) {
    console.error("Use --run --write together (or --run only to print JSON without writing).");
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
    const totalCards = validated.decks.reduce((s, d) => s + d.cards.length, 0);
    console.log(`Wrote ${OUT_FILE} (${validated.decks.length} decks, ${totalCards} cards)`);
  } else {
    console.log(JSON.stringify(validated, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
