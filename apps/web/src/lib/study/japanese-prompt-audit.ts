import "server-only";
import type { JapaneseFlashcardCatalog } from "../japanese-content/flashcard-catalog";
import type { JapaneseStudyCatalog } from "../japanese-content/study-catalog";
import { prepareJapaneseStudyImport } from "./japanese-import";
import { createJapanesePromptBank, gradeJapaneseStudyPrompt } from "./japanese-prompts";
import { JAPANESE_STUDY_TASKS } from "./japanese-public";

/** Full-corpus mechanics audit. It neither publishes nor certifies semantic distractor quality. */
export function auditJapaneseStudyPrompts(source: JapaneseFlashcardCatalog, study: JapaneseStudyCatalog) {
  const plan = prepareJapaneseStudyImport(source, study);
  const bank = createJapanesePromptBank(plan.cards.map(card => card.contentJson), source.reconciliation);
  const taskCounts = Object.fromEntries(JAPANESE_STUDY_TASKS.map(task => [task, 0]));
  let prompts = 0;
  let coveredSourceMembers = 0;
  let deferredIntroductionMembers = 0;
  const ids = new Set<string>();
  for (const unitId of bank.unitIds) {
    const tasks = bank.tasks(unitId);
    if (!tasks.length) throw new Error(`No Japanese task: ${unitId}`);
    for (const task of tasks) {
      const prompt = bank.create(unitId, { task, seed: "catalog-mechanics-audit-v1" });
      const correct = gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: prompt.correctChoiceId });
      const wrongChoice = prompt.question.choices.find(choice => choice.id !== prompt.correctChoiceId)!;
      const wrong = gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: wrongChoice.id });
      if (correct.status !== "graded" || !correct.correct || wrong.status !== "graded" || wrong.correct || ids.has(prompt.question.id)) throw new Error(`Japanese prompt grading/identity failure: ${unitId}`);
      ids.add(prompt.question.id); taskCounts[task]++; prompts++;
    }
    const introduced = new Set(bank.members(unitId));
    // Source members deferred at the introduction band must still be usable at
    // their own evidenced band. None may disappear behind canonical grouping.
    for (const memberId of bank.members(unitId, "N1")) {
      coveredSourceMembers++;
      if (!introduced.has(memberId)) deferredIntroductionMembers++;
      for (const task of bank.tasks(unitId, memberId, "N1")) {
        const prompt = bank.create(unitId, { task, memberId, studyBand: "N1", seed: "member-mechanics-audit-v1" });
        const result = gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: prompt.correctChoiceId });
        if (result.status !== "graded" || !result.correct) throw new Error(`Source member grading failed: ${memberId}`);
      }
    }
  }
  if (coveredSourceMembers !== source.cards.length) throw new Error("Japanese prompt source-member omission");
  return { schemaVersion: 1, status: "draft", revision: "japanese-study-prompts-v1", catalogSha256: plan.snapshot.studyCatalogSha256,
    units: bank.unitIds.length, prompts, taskCounts, coveredSourceMembers, deferredIntroductionMembers, omittedUnits: 0, publicationChanged: false,
  };
}
