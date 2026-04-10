import { PlacedLevel } from "@prisma/client";

export type PlacementQuestion = {
  id: string;
  /** Higher weight = harder item; counts more toward advanced placement */
  weight: number;
  promptJa: string;
  promptEn: string;
  optionsJa: string[];
  optionsEn: string[];
  correctIndex: number;
};

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: "p1",
    weight: 1,
    promptJa: "「りんご」に相当する英語は？",
    promptEn: 'Which word means "apple"?',
    optionsJa: ["banana", "apple", "orange"],
    optionsEn: ["banana", "apple", "orange"],
    correctIndex: 1,
  },
  {
    id: "p2",
    weight: 1,
    promptJa: "「私は学生です。」の英語として自然なのは？",
    promptEn: 'Choose the natural English for "I am a student."',
    optionsJa: ["I student.", "I am a student.", "I is student."],
    optionsEn: ["I student.", "I am a student.", "I is student."],
    correctIndex: 1,
  },
  {
    id: "p3",
    weight: 2,
    promptJa: "空所に入る最も適切な語は？「She _____ English for five years.」",
    promptEn: 'Best fit: "She _____ English for five years."',
    optionsJa: ["studies", "has studied", "is studying"],
    optionsEn: ["studies", "has studied", "is studying"],
    correctIndex: 1,
  },
  {
    id: "p4",
    weight: 2,
    promptJa: "「もし時間があれば、手伝います。」に近い英語は？",
    promptEn: 'Closest meaning: "If I have time, I will help."',
    optionsJa: [
      "If I have time, I help.",
      "If I had time, I would help.",
      "If I have time, I will help.",
    ],
    optionsEn: [
      "If I have time, I help.",
      "If I had time, I would help.",
      "If I have time, I will help.",
    ],
    correctIndex: 2,
  },
  {
    id: "p5",
    weight: 3,
    promptJa: "「彼が来るかどうかは不明だ。」に最も近いのは？",
    promptEn: 'Closest to: "Whether he will come is unclear."',
    optionsJa: [
      "If he comes is not clear.",
      "Whether he will come is unclear.",
      "That he comes is unclear if.",
    ],
    optionsEn: [
      "If he comes is not clear.",
      "Whether he will come is unclear.",
      "That he comes is unclear if.",
    ],
    correctIndex: 1,
  },
  {
    id: "p6",
    weight: 3,
    promptJa: "「提案された計画に難色を示した。」の意味に近い表現は？",
    promptEn:
      'Which best matches a formal tone for "They expressed reservations about the proposed plan."?',
    optionsJa: [
      "They hated the plan.",
      "They expressed reservations about the proposed plan.",
      "They did not know the plan.",
    ],
    optionsEn: [
      "They hated the plan.",
      "They expressed reservations about the proposed plan.",
      "They did not know the plan.",
    ],
    correctIndex: 1,
  },
];

export type PlacementQuestionPublic = Omit<PlacementQuestion, "correctIndex">;

export function getPlacementQuestionsForClient(): PlacementQuestionPublic[] {
  return PLACEMENT_QUESTIONS.map(({ correctIndex: _, ...rest }) => rest);
}

export function scorePlacementAnswers(
  answers: number[],
): { level: PlacedLevel; earned: number; max: number } {
  const max = PLACEMENT_QUESTIONS.reduce((s, q) => s + q.weight, 0);
  let earned = 0;
  for (let i = 0; i < PLACEMENT_QUESTIONS.length; i++) {
    const q = PLACEMENT_QUESTIONS[i];
    if (q && answers[i] === q.correctIndex) {
      earned += q.weight;
    }
  }
  const ratio = max > 0 ? earned / max : 0;
  let level: PlacedLevel;
  if (ratio < 0.38) {
    level = PlacedLevel.BEGINNER;
  } else if (ratio < 0.72) {
    level = PlacedLevel.INTERMEDIATE;
  } else {
    level = PlacedLevel.ADVANCED;
  }
  return { level, earned, max };
}
