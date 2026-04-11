import type { PlacementBankAuditIssue } from "@/lib/placement-bank/placement-bank-audit";
import type { AuditablePlacementQuestion } from "@/lib/placement-bank/placement-bank-audit";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Extra deterministic checks aimed at obvious **question ↔ marked answer** mismatches.
 * This is still not full semantic “does this MCQ teach the right nuance?” judgment (needs human/LLM).
 */
export function coherenceProxyIssues(q: AuditablePlacementQuestion): PlacementBankAuditIssue[] {
  const issues: PlacementBankAuditIssue[] = [];
  const push = (code: string, message: string) => issues.push({ id: q.id, code, message });
  const correctEn = q.optionsEn[q.correctIndex]?.trim() ?? "";
  const qen = q.questionEn;

  if (!correctEn) return issues;

  // Past-time frame + future marking in the **keyed** answer.
  if (q.section === "grammar" && /yesterday|last night|last week|ago\b/i.test(qen)) {
    const w = correctEn.toLowerCase();
    if (/\b(will|shall|'ll|going to)\b/.test(w)) {
      push(
        "COHERENCE_GRAMMAR_PAST_WITH_FUTURE_ANSWER",
        "Question is set in the past, but the marked correct option uses future marking.",
      );
    }
  }

  // Vocabulary: keyed answer should not be identical to the gloss headword (trivial / broken item).
  if (q.section === "vocabulary") {
    const m = /^"((?:\\.|[^"\\])*)"\s*$/u.exec(q.questionEn.trim());
    if (m) {
      const gloss = m[1]!.replace(/\\"/g, '"').trim().toLowerCase();
      const c = norm(correctEn).replace(/^"|"$/g, "");
      const g = gloss.replace(/^"|"$/g, "");
      if (g.length > 0 && g === c) {
        push("COHERENCE_VOCAB_ANSWER_EQUALS_GLOSS", "Marked correct English option is the same as the gloss text.");
      }
    }
  }

  // Functional “polite” price question: keyed line should look like a full polite request, not a fragment.
  if (q.section === "functional" && /polite|most polite|appropriate.*price|値段/i.test(q.instructionEn + q.questionEn)) {
    if (/price|値段/i.test(q.questionEn) && correctEn.length < 12) {
      push(
        "COHERENCE_FUNCTIONAL_PRICE_TOO_SHORT",
        "Question asks for a polite price request, but the marked correct English line is very short.",
      );
    }
  }

  return issues;
}

/** English learner-facing stem used for “same question” duplicate detection. */
export function normalizedLearnerEnglishStem(q: AuditablePlacementQuestion): string {
  return norm(`${q.instructionEn}\n${q.questionEn}`);
}
