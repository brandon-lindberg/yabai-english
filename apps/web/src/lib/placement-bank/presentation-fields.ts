import type { PlacementBankSection } from "@/lib/placement-bank/constants";

/** Internal scaffold suffix — strip before display; bank JSON should no longer contain this after migration. */
const ITEM_TAG = /\s+—\s+(A1|A2|B1|B2|C1)-(grammar|vocabulary|reading|functional)-\d{3}$/i;

export function stripPlacementBankItemTag(text: string): string {
  return text.replace(ITEM_TAG, "").trim();
}

/**
 * Split legacy single `promptEn` / `promptJa` strings into instruction (task) + question (content).
 * Used by one-off JSON migration; generators should emit the four fields directly.
 */
export function splitLegacyPromptsToPresentation(
  section: PlacementBankSection,
  promptEn: string,
  promptJa: string,
): { instructionEn: string; instructionJa: string; questionEn: string; questionJa: string } {
  const en = stripPlacementBankItemTag(promptEn);
  const ja = stripPlacementBankItemTag(promptJa);

  // Curated rows occasionally file a grammar cloze under `section: "vocabulary"`; split as grammar.
  if (section === "vocabulary" && /^Choose the best option:\s*"/i.test(en)) {
    return splitLegacyPromptsToPresentation("grammar", promptEn, promptJa);
  }

  if (section === "grammar") {
    const mEn = /^(Choose the best option:\s*)("(?:[^"\\]|\\.)*")\s*$/i.exec(en);
    if (mEn) {
      return {
        instructionEn: "Choose the best option.",
        questionEn: mEn[2]!.replace(/\\"/g, '"'),
        instructionJa: grammarInstructionJaFromJa(ja),
        questionJa: grammarQuestionJaFromJa(ja, mEn[2]!),
      };
    }
    if (/^Choose the correct sentence\.?$/i.test(en)) {
      return {
        instructionEn: "Choose the correct sentence.",
        questionEn: "Which option below is grammatically correct?",
        instructionJa: "正しい文を選んでください。",
        questionJa: "次の三つの文のうち、文法的に正しいものはどれですか？",
      };
    }
    const mJa = /^(空所に入る語を選んでください:\s*)("(?:[^"\\]|\\.)*")\s*$/.exec(ja);
    if (mJa) {
      return {
        instructionEn: "Choose the best option.",
        questionEn: extractQuotedGrammarEn(en) ?? en,
        instructionJa: "空所に入る語を選んでください。",
        questionJa: mJa[2]!.replace(/\\"/g, '"'),
      };
    }
    const condJa = /^(条件文の空所:\s*)("(?:[^"\\]|\\.)*")\s*$/.exec(ja);
    if (condJa) {
      return {
        instructionEn: "Choose the best option for the conditional.",
        questionEn: extractQuotedGrammarEn(en) ?? en,
        instructionJa: "条件文の空所に入る語を選んでください。",
        questionJa: condJa[2]!.replace(/\\"/g, '"'),
      };
    }
    if (/^倒置を含む文の空所を選んでください。/.test(ja)) {
      return {
        instructionEn: "Choose the best option.",
        questionEn: extractQuotedGrammarEn(en) ?? en,
        instructionJa: "倒置を含む文の空所を選んでください。",
        questionJa: extractQuotedGrammarJa(ja) ?? ja,
      };
    }
    if (/^仮定法の自然な形を選んでください/.test(ja)) {
      return {
        instructionEn: "Choose the best option.",
        questionEn: extractQuotedGrammarEn(en) ?? en,
        instructionJa: "仮定法の自然な形を選んでください。",
        questionJa: extractQuotedGrammarJa(ja) ?? ja,
      };
    }
  }

  if (section === "vocabulary") {
    const mPhrase =
      /^Choose the word or phrase closest in meaning to\s+("([^"]+)")\s*\.?\s*$/i.exec(en) ||
      /^Choose the word or phrase closest in meaning to\s+('([^']+)')\s*\.?\s*$/i.exec(en);
    const mClose = /^Choose the word closest to\s+("([^"]+)")\s*\.?\s*$/i.exec(en);
    const mPhraseShort = /^Choose the phrase closest to\s+("([^"]+)")\s*\.?\s*$/i.exec(en);
    const mEn = mPhrase || mClose || mPhraseShort;
    if (mEn) {
      const gloss = (mEn[2] ?? mEn[1])!.replace(/\\"/g, '"').replace(/\.$/, "");
      const quoted = gloss.startsWith('"') ? gloss : `"${gloss}"`;
      return {
        instructionEn: "Choose the word or phrase closest in meaning to the following.",
        questionEn: quoted,
        instructionJa: "次の語句の意味に最も近い英語を選んでください。",
        questionJa: extractJapaneseGlossFromVocabJa(ja) ?? quoted,
      };
    }
    const mIn = /^In\s+("(?:[^"\\]|\\.)*"),\s*(.+)\??\s*$/i.exec(en);
    if (mIn) {
      return {
        instructionEn: "Use context from the sentence below.",
        questionEn: `${mIn[1]!.replace(/\\"/g, '"')} ${mIn[2]}`.trim(),
        instructionJa: "次の文を踏まえて答えてください。",
        questionJa: ja,
      };
    }
    if (/^Choose the most natural collocation\.?$/i.test(en)) {
      return {
        instructionEn: "Choose the most natural collocation.",
        questionEn: "Which option fits best?",
        instructionJa: "最も自然なコロケーションを選んでください。",
        questionJa: "どの組み合わせが最も自然ですか？",
      };
    }
    const mJaV = /^「(.+)」に最も近い語句を選んでください。?$/.exec(ja);
    if (mJaV) {
      return {
        instructionEn: "Choose the word or phrase closest in meaning to the following.",
        questionEn: extractEnglishGlossFromVocabEn(en) ?? `"${mJaV[1]}"`,
        instructionJa: "次の語句の意味に最も近い英語を選んでください。",
        questionJa: `「${mJaV[1]}」`,
      };
    }
  }

  if (section === "reading") {
    const readEn = /^Read:\s*("(?:[^"\\]|\\.)*")\s*(.+)$/i.exec(en);
    if (readEn) {
      return {
        instructionEn: "Read the passage, then answer the question.",
        questionEn: `${readEn[1]!.replace(/\\"/g, '"')} ${readEn[2]!.trim()}`.trim(),
        instructionJa: "英文を読んで、質問に答えてください。",
        questionJa: ja,
      };
    }
    const ra = /^Read and answer:\s*("(?:[^"\\]|\\.)*")\s*(.+)$/i.exec(en);
    if (ra) {
      return {
        instructionEn: "Read the passage, then answer the question.",
        questionEn: `${ra[1]!.replace(/\\"/g, '"')} ${ra[2]!.trim()}`.trim(),
        instructionJa: "英文を読んで、質問に答えてください。",
        questionJa: ja,
      };
    }
    const tx = /^Text:\s*("(?:[^"\\]|\\.)*")\s*(.+)$/i.exec(en);
    if (tx) {
      return {
        instructionEn: "Read the passage, then answer the question.",
        questionEn: `${tx[1]!.replace(/\\"/g, '"')} ${tx[2]!.trim()}`.trim(),
        instructionJa: "文章を読んで、質問に答えてください。",
        questionJa: ja,
      };
    }
    if (/^読解:/.test(ja)) {
      return {
        instructionEn: "Read the passage, then answer the question.",
        questionEn: en,
        instructionJa: "英文を読んで、質問に答えてください。",
        questionJa: ja,
      };
    }
  }

  // functional + fallback
  return {
    instructionEn: "Choose the most appropriate option.",
    questionEn: en,
    instructionJa: "最も適切な表現を選んでください。",
    questionJa: ja,
  };
}

function extractQuotedGrammarEn(full: string): string | null {
  const m = /"((?:[^"\\]|\\.)*)"/.exec(full);
  return m ? `"${m[1]!.replace(/\\"/g, '"')}"` : null;
}

function extractQuotedGrammarJa(full: string): string | null {
  const m = /"((?:[^"\\]|\\.)*)"/.exec(full);
  return m ? `"${m[1]!.replace(/\\"/g, '"')}"` : null;
}

function grammarInstructionJaFromJa(ja: string): string {
  if (/空所に入る語を選んでください/.test(ja)) return "空所に入る語を選んでください。";
  if (/条件文の空所/.test(ja)) return "条件文の空所に入る語を選んでください。";
  if (/倒置/.test(ja)) return "倒置を含む文の空所を選んでください。";
  if (/仮定法/.test(ja)) return "仮定法の自然な形を選んでください。";
  return "指示に従って、最も適切な語を選んでください。";
}

function grammarQuestionJaFromJa(ja: string, quoteEn: string): string {
  const q = extractQuotedGrammarJa(ja);
  if (q) return q;
  return quoteEn;
}

function extractJapaneseGlossFromVocabJa(ja: string): string | null {
  const m = /^「(.+)」に/.exec(ja);
  return m ? `「${m[1]}」` : null;
}

function extractEnglishGlossFromVocabEn(en: string): string | null {
  const mPhrase =
    /^Choose the word or phrase closest in meaning to\s+("([^"]+)")\s*\.?\s*$/i.exec(en) ||
    /^Choose the word or phrase closest in meaning to\s+('([^']+)')\s*\.?\s*$/i.exec(en);
  const mClose = /^Choose the word closest to\s+("([^"]+)")\s*\.?\s*$/i.exec(en);
  const mPhraseShort = /^Choose the phrase closest to\s+("([^"]+)")\s*\.?\s*$/i.exec(en);
  const mEn = mPhrase || mClose || mPhraseShort;
  if (!mEn) return null;
  const gloss = (mEn[2] ?? mEn[1])!.replace(/\\"/g, '"').replace(/\.$/, "");
  return gloss.startsWith('"') ? gloss : `"${gloss}"`;
}
