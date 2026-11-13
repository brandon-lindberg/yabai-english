import type { JapaneseStudyQuestion, JapaneseStudyFeedback } from "../src/lib/study/japanese-public";

/** Synthetic interface examples; never imported by application code. */
export const studyQuestion: JapaneseStudyQuestion = {
  id: "prompt-one", unitId: "cat", memberId: "cat", task: "vocabulary_meaning",
  instruction: { en: "Choose a meaning of this word.", ja: "この言葉の意味を選んでください。" },
  level: { introduction: "N5", source: "N5", form: "N5" }, stimulus: { written: "猫", reading: "ねこ" }, usage: [],
  choices: [{ id: "choice-a", text: "cat" }, { id: "choice-b", text: "dog" }],
};
export const kanjiQuestion: JapaneseStudyQuestion = {
  ...studyQuestion, id: "prompt-two", unitId: "eat", memberId: "eat", task: "kanji_kun",
  instruction: { en: "Choose a kun-reading of this kanji.", ja: "この漢字の訓読みを選んでください。" },
  stimulus: { written: "食", meanings: ["eat", "food"] },
  choices: [{ id: "kun-a", text: "た.べる" }, { id: "kun-b", text: "の.む" }],
};
export const studyQueue = (questions = [studyQuestion, kanjiQuestion]) => ({
  levelCode: "N5", cards: questions.map(question => ({ question, expiresAt: "2030-01-01T00:00:00.000Z" })),
});
export const studyResult = (question = studyQuestion, correct = true) => ({
  promptId: question.id, correct,
  feedback: (question.task.startsWith("kanji_")
    ? { written: "食", meanings: ["eat", "food"], onyomi: ["ショク", "ジキ"], kunyomi: ["た.べる", "く.う"], nanori: ["じき"] }
    : { written: "猫", reading: "ねこ", meanings: ["cat"] }) satisfies JapaneseStudyFeedback,
  xpGained: correct ? 12 : 2, levelXp: 12, totalStudyXp: 12, masteryScore: 0,
  correctCount: correct ? 1 : 0, wrongCount: correct ? 0 : 1, streakCorrect: correct ? 1 : 0,
  accuracyPercent: correct ? 100 : 0, averageAnswerMs: 2000, practiceBand: "learning", unlocked: ["N5", "N4"], completed: [],
});
