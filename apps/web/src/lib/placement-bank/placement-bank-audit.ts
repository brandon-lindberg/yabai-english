import type { PlacementBankBand, PlacementBankSection } from "@/lib/placement-bank/constants";

/** One automated quality check failure for a placement bank row. */
export type PlacementBankAuditIssue = {
  id: string;
  code: string;
  message: string;
};

export type AuditablePlacementQuestion = {
  id: string;
  cefrBand: PlacementBankBand;
  section: PlacementBankSection;
  instructionEn: string;
  instructionJa: string;
  questionEn: string;
  questionJa: string;
  optionsEn: string[];
  optionsJa: string[];
  correctIndex: number;
};

const INTERNAL_MARKERS = [/—\s*[ABC][12]/i, /\(set\s+\d+\)/i, /（セット\s*\d+）/];

/** Digits 1–20 as words, for lateness lines that spell out minutes (e.g. curated "five"). */
const MINUTE_WORDS: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  11: "eleven",
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
  15: "fifteen",
  16: "sixteen",
  17: "seventeen",
  18: "eighteen",
  19: "nineteen",
  20: "twenty",
};

function minutesMentionedInText(minute: number, text: string): boolean {
  if (text.includes(String(minute))) return true;
  const w = MINUTE_WORDS[minute];
  return w ? new RegExp(`\\b${w}\\b`, "i").test(text) : false;
}

function hasInternalMarker(s: string) {
  return INTERNAL_MARKERS.some((re) => re.test(s));
}

function normEn(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic checks for structure, distractor quality, and a few template-specific
 * answer–prompt alignments (A1 reading close time, A2 functional lateness minutes).
 * Does not judge semantic “naturalness” of every gloss—that still needs human spot-checks.
 */
export function auditPlacementQuestion(q: AuditablePlacementQuestion): PlacementBankAuditIssue[] {
  const issues: PlacementBankAuditIssue[] = [];
  const { id, section, cefrBand } = q;

  const push = (code: string, message: string) => issues.push({ id, code, message });

  for (const [label, v] of [
    ["instructionEn", q.instructionEn],
    ["instructionJa", q.instructionJa],
    ["questionEn", q.questionEn],
    ["questionJa", q.questionJa],
  ] as const) {
    if (!v.trim()) push("EMPTY_FIELD", `${label} is empty or whitespace-only`);
  }

  for (const [label, v] of [
    ["instructionEn", q.instructionEn],
    ["instructionJa", q.instructionJa],
    ["questionEn", q.questionEn],
    ["questionJa", q.questionJa],
  ] as const) {
    if (hasInternalMarker(v)) push("INTERNAL_MARKER", `${label} contains learner-inappropriate disambiguator text`);
  }

  if (normEn(q.instructionEn) === normEn(q.questionEn) && q.instructionEn.trim().length > 0) {
    push("INSTRUCTION_EQUALS_QUESTION_EN", "instructionEn and questionEn are identical (nothing to separate in the UI)");
  }

  if (q.correctIndex < 0 || q.correctIndex > 2) push("BAD_CORRECT_INDEX", `correctIndex out of range: ${q.correctIndex}`);

  if (q.optionsEn.length !== 3 || q.optionsJa.length !== 3) {
    push("OPTION_COUNT", `expected 3 options each, got EN=${q.optionsEn.length} JA=${q.optionsJa.length}`);
    return issues;
  }

  for (let i = 0; i < 3; i++) {
    if (!q.optionsEn[i]!.trim()) push("EMPTY_OPTION_EN", `optionsEn[${i}] is empty`);
    if (!q.optionsJa[i]!.trim()) push("EMPTY_OPTION_JA", `optionsJa[${i}] is empty`);
  }

  const enSet = new Set(q.optionsEn.map(normEn));
  if (enSet.size < 3) push("DUPLICATE_OPTION_EN", "Two or more English options are the same after trim/lowercase");

  const jaSet = new Set(q.optionsJa.map((s) => s.trim()));
  if (section === "grammar") {
    if (jaSet.size < 2) push("WEAK_OPTION_JA", "Fewer than 2 distinct Japanese option lines (grammar)");
  } else if (jaSet.size < 3) {
    push("DUPLICATE_OPTION_JA", "Two or more Japanese options are identical—learners cannot distinguish choices fairly");
  }

  const correctEn = q.optionsEn[q.correctIndex];
  if (!correctEn?.trim()) push("CORRECT_EMPTY", "Correct option (by correctIndex) is empty");

  if (section === "vocabulary") {
    const t = q.questionEn.trim();
    const okShape =
      /^"((?:\\.|[^"\\])*)"\s*$/u.test(t) ||
      /^In\s+"/iu.test(t) ||
      /\b___\b/u.test(t) ||
      /^Which option fits best\?$/iu.test(t);
    if (!okShape) {
      push(
        "VOCAB_QUESTION_SHAPE",
        "questionEn should be a quoted gloss, an In-context line, a cloze with ___, or the collocation follow-up line",
      );
    }
  }

  if (section === "grammar" && q.questionEn.includes("___")) {
    for (const opt of q.optionsEn) {
      if (opt.includes("___")) push("OPTION_CONTAINS_BLANK", `Grammar option contains blank marker: ${opt.slice(0, 40)}…`);
      if (opt.length > 80) push("OPTION_TOO_LONG", `Grammar option unusually long (${opt.length} chars)`);
    }
  }

  // A1 reading: closing time in passage must match keyed correct answer.
  if (section === "reading" && cefrBand === "A1") {
    const m = /closes at (\d+):00/i.exec(q.questionEn);
    if (m) {
      const want = `${m[1]}:00`;
      if (normEn(correctEn ?? "") !== normEn(want)) {
        push("READING_A1_CLOSE_MISMATCH", `Passage implies close ${want} but correct option is "${correctEn}"`);
      }
    }
  }

  // A2 reading: deadline in quote vs correct option.
  if (section === "reading" && cefrBand === "A2") {
    const m = /Monday (\d+) p\.m\./i.exec(q.questionEn);
    if (m) {
      const want = `Monday ${m[1]} p.m.`;
      if (normEn(correctEn ?? "") !== normEn(want)) {
        push("READING_A2_DEADLINE_MISMATCH", `Question implies "${want}" but correct option is "${correctEn}"`);
      }
    }
  }

  // A2 functional: stated minutes must appear in the correct apology line (digit or common word 1–20).
  if (section === "functional" && cefrBand === "A2") {
    const m = /(\d+)\s+minutes late/i.exec(q.questionEn);
    if (m && correctEn) {
      const n = Number.parseInt(m[1]!, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 60 && !minutesMentionedInText(n, correctEn)) {
        push(
          "FUNCTIONAL_A2_MINUTES_MISMATCH",
          `Question says ${n} minutes late but correct option does not reflect that number clearly: "${correctEn.slice(0, 100)}…"`,
        );
      }
    }
  }

  return issues;
}

export function auditPlacementBank(questions: AuditablePlacementQuestion[]): {
  issues: PlacementBankAuditIssue[];
  errorCount: number;
} {
  const issues: PlacementBankAuditIssue[] = [];
  for (const q of questions) {
    issues.push(...auditPlacementQuestion(q));
  }
  return { issues, errorCount: issues.length };
}
