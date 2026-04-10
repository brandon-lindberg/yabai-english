import { PlacedLevel } from "@prisma/client";

export type PlacementQuestion = {
  id: string;
  /** Higher weight = harder item; counts more toward advanced placement */
  weight: number;
  section: "grammar" | "vocabulary" | "reading" | "functional";
  cefrBand: "A1" | "A2" | "B1" | "B2" | "C1";
  promptJa: string;
  promptEn: string;
  optionsJa: string[];
  optionsEn: string[];
  correctIndex: number;
};

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: "g-a1-1",
    weight: 1,
    section: "grammar",
    cefrBand: "A1",
    promptJa: "空所に入る語を選んでください: \"She ___ from Japan.\"",
    promptEn: 'Choose the best option: "She ___ from Japan."',
    optionsJa: ["is", "are", "am"],
    optionsEn: ["is", "are", "am"],
    correctIndex: 0,
  },
  {
    id: "g-a1-2",
    weight: 1,
    section: "grammar",
    cefrBand: "A1",
    promptJa: "正しい文を選んでください。",
    promptEn: "Choose the correct sentence.",
    optionsJa: ["He don't like coffee.", "He doesn't like coffee.", "He doesn't likes coffee."],
    optionsEn: ["He don't like coffee.", "He doesn't like coffee.", "He doesn't likes coffee."],
    correctIndex: 1,
  },
  {
    id: "g-a2-1",
    weight: 2,
    section: "grammar",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"I ___ my homework before dinner yesterday.\"",
    promptEn: 'Choose the best option: "I ___ my homework before dinner yesterday."',
    optionsJa: ["finish", "finished", "have finished"],
    optionsEn: ["finish", "finished", "have finished"],
    correctIndex: 1,
  },
  {
    id: "g-a2-2",
    weight: 2,
    section: "grammar",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"There aren't ___ apples left.\"",
    promptEn: 'Choose the best option: "There aren\'t ___ apples left."',
    optionsJa: ["some", "any", "much"],
    optionsEn: ["some", "any", "much"],
    correctIndex: 1,
  },
  {
    id: "g-b1-1",
    weight: 3,
    section: "grammar",
    cefrBand: "B1",
    promptJa: "空所に入る最も自然な語を選んでください: \"If it ___ tomorrow, we'll cancel the picnic.\"",
    promptEn: 'Choose the best option: "If it ___ tomorrow, we\'ll cancel the picnic."',
    optionsJa: ["rains", "will rain", "would rain"],
    optionsEn: ["rains", "will rain", "would rain"],
    correctIndex: 0,
  },
  {
    id: "g-b1-2",
    weight: 3,
    section: "grammar",
    cefrBand: "B1",
    promptJa: "空所に入る語を選んでください: \"By the time we arrived, the movie ___.\"",
    promptEn: 'Choose the best option: "By the time we arrived, the movie ___."',
    optionsJa: ["started", "had started", "has started"],
    optionsEn: ["started", "had started", "has started"],
    correctIndex: 1,
  },
  {
    id: "g-b2-1",
    weight: 4,
    section: "grammar",
    cefrBand: "B2",
    promptJa: "空所に入る語を選んでください: \"Hardly ___ the meeting started when the fire alarm went off.\"",
    promptEn: 'Choose the best option: "Hardly ___ the meeting started when the fire alarm went off."',
    optionsJa: ["had", "did", "was"],
    optionsEn: ["had", "did", "was"],
    correctIndex: 0,
  },
  {
    id: "g-c1-1",
    weight: 5,
    section: "grammar",
    cefrBand: "C1",
    promptJa: "最も自然な文を選んでください。",
    promptEn: "Choose the most natural sentence.",
    optionsJa: [
      "Not only the manager apologized, but also offered a refund.",
      "Not only did the manager apologize, but he also offered a refund.",
      "Not only the manager did apologize, but he offered also a refund.",
    ],
    optionsEn: [
      "Not only the manager apologized, but also offered a refund.",
      "Not only did the manager apologize, but he also offered a refund.",
      "Not only the manager did apologize, but he offered also a refund.",
    ],
    correctIndex: 1,
  },
  {
    id: "v-a1-1",
    weight: 1,
    section: "vocabulary",
    cefrBand: "A1",
    promptJa: "「安い」に最も近い語を選んでください。",
    promptEn: 'Choose the word closest to "inexpensive."',
    optionsJa: ["cheap", "large", "quiet"],
    optionsEn: ["cheap", "large", "quiet"],
    correctIndex: 0,
  },
  {
    id: "v-a2-1",
    weight: 2,
    section: "vocabulary",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"Could you ___ me a favor?\"",
    promptEn: 'Choose the best option: "Could you ___ me a favor?"',
    optionsJa: ["do", "make", "take"],
    optionsEn: ["do", "make", "take"],
    correctIndex: 0,
  },
  {
    id: "v-a2-2",
    weight: 2,
    section: "vocabulary",
    cefrBand: "A2",
    promptJa: "「予約する」の意味に最も近い語句を選んでください。",
    promptEn: 'Choose the phrase closest to "reserve."',
    optionsJa: ["book in advance", "look around", "turn down"],
    optionsEn: ["book in advance", "look around", "turn down"],
    correctIndex: 0,
  },
  {
    id: "v-b1-1",
    weight: 3,
    section: "vocabulary",
    cefrBand: "B1",
    promptJa: "空所に入る語を選んでください: \"The new policy will ___ everyone in the company.\"",
    promptEn: 'Choose the best option: "The new policy will ___ everyone in the company."',
    optionsJa: ["affect", "effect", "infect"],
    optionsEn: ["affect", "effect", "infect"],
    correctIndex: 0,
  },
  {
    id: "v-b1-2",
    weight: 3,
    section: "vocabulary",
    cefrBand: "B1",
    promptJa: "最も自然なコロケーションを選んでください。",
    promptEn: "Choose the most natural collocation.",
    optionsJa: ["make progress", "do progress", "take progress"],
    optionsEn: ["make progress", "do progress", "take progress"],
    correctIndex: 0,
  },
  {
    id: "v-b2-1",
    weight: 4,
    section: "vocabulary",
    cefrBand: "B2",
    promptJa: "「The proposal was rejected due to budget constraints.」で constraints に最も近い意味は？",
    promptEn: 'In "The proposal was rejected due to budget constraints," what does constraints mean?',
    optionsJa: ["limitations", "benefits", "bonuses"],
    optionsEn: ["limitations", "benefits", "bonuses"],
    correctIndex: 0,
  },
  {
    id: "v-c1-1",
    weight: 5,
    section: "vocabulary",
    cefrBand: "C1",
    promptJa: "最も適切な語を選んでください: \"The CEO's statement was deliberately ___ to avoid legal risk.\"",
    promptEn: 'Choose the best option: "The CEO\'s statement was deliberately ___ to avoid legal risk."',
    optionsJa: ["unequivocal", "ambiguous", "redundant"],
    optionsEn: ["unequivocal", "ambiguous", "redundant"],
    correctIndex: 1,
  },
  {
    id: "r-a2-1",
    weight: 2,
    section: "reading",
    cefrBand: "A2",
    promptJa:
      "文を読んで答えてください: \"The museum opens at 9:00 and closes at 17:00. Last entry is at 16:30.\" 最終入場は？",
    promptEn:
      'Read and answer: "The museum opens at 9:00 and closes at 17:00. Last entry is at 16:30." What is the last entry time?',
    optionsJa: ["16:00", "16:30", "17:00"],
    optionsEn: ["16:00", "16:30", "17:00"],
    correctIndex: 1,
  },
  {
    id: "r-a2-2",
    weight: 2,
    section: "reading",
    cefrBand: "A2",
    promptJa:
      "文を読んで答えてください: \"Please submit your report by Friday noon.\" いつまでに提出する必要がありますか？",
    promptEn:
      'Read and answer: "Please submit your report by Friday noon." When is the deadline?',
    optionsJa: ["金曜の正午まで", "金曜の夜まで", "土曜の朝まで"],
    optionsEn: ["By Friday noon", "By Friday night", "By Saturday morning"],
    correctIndex: 0,
  },
  {
    id: "r-b1-1",
    weight: 3,
    section: "reading",
    cefrBand: "B1",
    promptJa:
      "文章: \"Although the weather forecast predicted rain, the event organizers decided to proceed, citing improved drainage systems.\" 主催者が開催した主な理由は？",
    promptEn:
      'Text: "Although the weather forecast predicted rain, the event organizers decided to proceed, citing improved drainage systems." Why did they proceed?',
    optionsJa: ["雨予報が外れたから", "排水設備が改善されていたから", "参加者が少なかったから"],
    optionsEn: [
      "Because the forecast was wrong",
      "Because drainage systems had improved",
      "Because attendance was low",
    ],
    correctIndex: 1,
  },
  {
    id: "r-b1-2",
    weight: 3,
    section: "reading",
    cefrBand: "B1",
    promptJa:
      "文章: \"Sales increased by 12%, largely due to repeat customers rather than new acquisitions.\" 何が増加の主因でしたか？",
    promptEn:
      'Text: "Sales increased by 12%, largely due to repeat customers rather than new acquisitions." What mainly drove the increase?',
    optionsJa: ["新規顧客", "既存顧客の再購入", "広告費の削減"],
    optionsEn: ["New customers", "Repeat customers", "Reduced advertising costs"],
    correctIndex: 1,
  },
  {
    id: "r-b2-1",
    weight: 4,
    section: "reading",
    cefrBand: "B2",
    promptJa:
      "文章: \"The committee's recommendation, while not legally binding, carries substantial influence over municipal funding decisions.\" recommendation の性質として正しいのは？",
    promptEn:
      'Text: "The committee\'s recommendation, while not legally binding, carries substantial influence over municipal funding decisions." Which is true?',
    optionsJa: [
      "法的拘束力があり必ず従う必要がある",
      "法的拘束力はないが、実務上の影響は大きい",
      "資金配分には全く影響しない",
    ],
    optionsEn: [
      "It is legally binding",
      "It is not binding but highly influential",
      "It has no effect on funding decisions",
    ],
    correctIndex: 1,
  },
  {
    id: "r-c1-1",
    weight: 5,
    section: "reading",
    cefrBand: "C1",
    promptJa:
      "文章: \"While the initiative was praised publicly, internal reports suggested implementation had been uneven across regions.\" どの推論が妥当ですか？",
    promptEn:
      'Text: "While the initiative was praised publicly, internal reports suggested implementation had been uneven across regions." Which inference is best?',
    optionsJa: [
      "実施は全地域で同程度に成功した",
      "公的評価と内部評価にギャップがある",
      "この施策はすでに終了している",
    ],
    optionsEn: [
      "Implementation succeeded equally in all regions",
      "There is a gap between public praise and internal findings",
      "The initiative has already ended",
    ],
    correctIndex: 1,
  },
  {
    id: "f-a1-1",
    weight: 1,
    section: "functional",
    cefrBand: "A1",
    promptJa: "店員に丁寧に値段を聞く最も自然な表現は？",
    promptEn: "Which is the most polite way to ask the price?",
    optionsJa: ["How much is this?", "Price?", "Tell me price now."],
    optionsEn: ["How much is this?", "Price?", "Tell me price now."],
    correctIndex: 0,
  },
  {
    id: "f-a2-1",
    weight: 2,
    section: "functional",
    cefrBand: "A2",
    promptJa: "会議に5分遅れる連絡として最も適切なのは？",
    promptEn: "Which message is most appropriate if you will be 5 minutes late to a meeting?",
    optionsJa: [
      "I'm stuck in traffic. I'll be there in about five minutes. Sorry.",
      "Meeting late me.",
      "You start. I maybe come.",
    ],
    optionsEn: [
      "I'm stuck in traffic. I'll be there in about five minutes. Sorry.",
      "Meeting late me.",
      "You start. I maybe come.",
    ],
    correctIndex: 0,
  },
  {
    id: "f-b1-1",
    weight: 3,
    section: "functional",
    cefrBand: "B1",
    promptJa: "丁寧に意見に反対する最も適切な表現は？",
    promptEn: "Which is the most appropriate way to disagree politely?",
    optionsJa: [
      "You're wrong.",
      "I see your point, but I have a different view.",
      "No, absolutely not.",
    ],
    optionsEn: [
      "You're wrong.",
      "I see your point, but I have a different view.",
      "No, absolutely not.",
    ],
    correctIndex: 1,
  },
  {
    id: "f-b1-2",
    weight: 3,
    section: "functional",
    cefrBand: "B1",
    promptJa: "上司への依頼メールの締めとして最も適切なのは？",
    promptEn: "Which closing is most suitable in a request email to your manager?",
    optionsJa: [
      "Let me know if this works for you. Thank you.",
      "Reply soon.",
      "Do it quickly.",
    ],
    optionsEn: [
      "Let me know if this works for you. Thank you.",
      "Reply soon.",
      "Do it quickly.",
    ],
    correctIndex: 0,
  },
  {
    id: "f-b2-1",
    weight: 4,
    section: "functional",
    cefrBand: "B2",
    promptJa: "交渉で譲歩しつつ条件提示する最も適切な文は？",
    promptEn: "Which sentence best shows concession plus condition in negotiation?",
    optionsJa: [
      "We can reduce the fee, provided the contract term is extended.",
      "We reduce fee. You choose.",
      "No discount unless maybe later.",
    ],
    optionsEn: [
      "We can reduce the fee, provided the contract term is extended.",
      "We reduce fee. You choose.",
      "No discount unless maybe later.",
    ],
    correctIndex: 0,
  },
  {
    id: "f-c1-1",
    weight: 5,
    section: "functional",
    cefrBand: "C1",
    promptJa: "苦情対応として最も適切な文を選んでください。",
    promptEn: "Choose the most appropriate response to a customer complaint.",
    optionsJa: [
      "That's not our fault.",
      "I understand your frustration. Let me look into this immediately and update you by 3 p.m.",
      "Please calm down first.",
    ],
    optionsEn: [
      "That's not our fault.",
      "I understand your frustration. Let me look into this immediately and update you by 3 p.m.",
      "Please calm down first.",
    ],
    correctIndex: 1,
  },
];

export type PlacementQuestionPublic = Omit<PlacementQuestion, "correctIndex">;

export const PLACEMENT_WRITING_TASK = {
  promptJa:
    "あなたの英語学習の目的と、最近直面した仕事または日常のコミュニケーション課題について、60-120語で英語で書いてください。",
  promptEn:
    "In 60-120 words, describe your English-learning goals and one communication challenge you recently faced at work or in daily life.",
  minWords: 60,
  recommendedWords: 120,
} as const;

export function getPlacementQuestionsForClient(): PlacementQuestionPublic[] {
  return PLACEMENT_QUESTIONS.map(({ correctIndex: _, ...rest }) => rest);
}

export type SectionScore = {
  earned: number;
  max: number;
  ratio: number;
};

export type PlacementFeedbackCode =
  | "writingTooShort"
  | "limitedSentenceVariety"
  | "articleOrPluralRisk"
  | "prepositionRisk"
  | "goodTaskCompletion"
  | "strongCoherence";

export function evaluateWritingSample(sample: string): {
  earned: number;
  max: number;
  ratio: number;
  feedbackCodes: PlacementFeedbackCode[];
} {
  const max = 12;
  const text = sample.trim();
  const words = text.length === 0 ? [] : text.split(/\s+/);
  const wordCount = words.length;
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let score = 0;
  const feedbackCodes: PlacementFeedbackCode[] = [];

  if (wordCount >= 60) score += 4;
  else if (wordCount >= 40) score += 2;
  else feedbackCodes.push("writingTooShort");

  if (sentences.length >= 4) score += 2;
  else feedbackCodes.push("limitedSentenceVariety");

  const hasLinkers = /\b(because|however|although|therefore|for example|in addition)\b/i.test(text);
  if (hasLinkers) {
    score += 2;
    feedbackCodes.push("strongCoherence");
  }

  const articleRisk = /\bI have experience in [a-z]+\b/i.test(text) || /\bI am engineer\b/i.test(text);
  if (!articleRisk) score += 2;
  else feedbackCodes.push("articleOrPluralRisk");

  const prepRisk = /\bdiscuss about\b/i.test(text) || /\bmarried with\b/i.test(text);
  if (!prepRisk) score += 2;
  else feedbackCodes.push("prepositionRisk");

  if (wordCount >= 60 && sentences.length >= 4) {
    feedbackCodes.push("goodTaskCompletion");
  }

  return {
    earned: Math.max(0, Math.min(max, score)),
    max,
    ratio: max > 0 ? Math.max(0, Math.min(max, score)) / max : 0,
    feedbackCodes,
  };
}

export function scorePlacementAnswers(
  answers: number[],
  writingSample?: string,
): {
  level: PlacedLevel;
  earned: number;
  max: number;
  sectionScores: Record<PlacementQuestion["section"] | "writing", SectionScore>;
  strengths: string[];
  improvements: string[];
  writingFeedback: PlacementFeedbackCode[];
  needsManualReview: boolean;
  manualReviewReasons: string[];
} {
  const objectiveMax = PLACEMENT_QUESTIONS.reduce((s, q) => s + q.weight, 0);
  let earned = 0;
  const sectionScores: Record<PlacementQuestion["section"] | "writing", SectionScore> = {
    grammar: { earned: 0, max: 0, ratio: 0 },
    vocabulary: { earned: 0, max: 0, ratio: 0 },
    reading: { earned: 0, max: 0, ratio: 0 },
    functional: { earned: 0, max: 0, ratio: 0 },
    writing: { earned: 0, max: 0, ratio: 0 },
  };

  for (let i = 0; i < PLACEMENT_QUESTIONS.length; i++) {
    const q = PLACEMENT_QUESTIONS[i];
    if (!q) continue;
    sectionScores[q.section].max += q.weight;
    if (answers[i] === q.correctIndex) {
      earned += q.weight;
      sectionScores[q.section].earned += q.weight;
    }
  }

  for (const key of ["grammar", "vocabulary", "reading", "functional"] as const) {
    const section = sectionScores[key];
    section.ratio = section.max > 0 ? section.earned / section.max : 0;
  }

  const writing = evaluateWritingSample(writingSample ?? "");
  sectionScores.writing = {
    earned: writing.earned,
    max: writing.max,
    ratio: writing.ratio,
  };

  const max = objectiveMax + writing.max;
  const totalEarned = earned + writing.earned;
  const ratio = max > 0 ? totalEarned / max : 0;

  let level: PlacedLevel;
  if (
    ratio >= 0.78 &&
    sectionScores.grammar.ratio >= 0.6 &&
    sectionScores.reading.ratio >= 0.6 &&
    sectionScores.writing.ratio >= 0.55
  ) {
    level = PlacedLevel.ADVANCED;
  } else if (
    ratio >= 0.45 &&
    sectionScores.grammar.ratio >= 0.35 &&
    sectionScores.reading.ratio >= 0.3
  ) {
    level = PlacedLevel.INTERMEDIATE;
  } else {
    level = PlacedLevel.BEGINNER;
  }

  const strengths: string[] = [];
  const improvements: string[] = [];
  const manualReviewReasons: string[] = [];
  const sectionOrder: Array<keyof typeof sectionScores> = [
    "grammar",
    "vocabulary",
    "reading",
    "functional",
    "writing",
  ];

  for (const key of sectionOrder) {
    const ratioValue = sectionScores[key].ratio;
    if (ratioValue >= 0.7) strengths.push(key);
    if (ratioValue < 0.5) improvements.push(key);
  }

  const beginnerCut = 0.45;
  const advancedCut = 0.78;
  if (Math.abs(ratio - beginnerCut) <= 0.03) {
    manualReviewReasons.push("nearBeginnerIntermediateBoundary");
  }
  if (Math.abs(ratio - advancedCut) <= 0.03) {
    manualReviewReasons.push("nearIntermediateAdvancedBoundary");
  }
  if (writing.feedbackCodes.includes("writingTooShort")) {
    manualReviewReasons.push("writingTooShortForConfidentPlacement");
  }

  const maxSectionRatio = Math.max(
    sectionScores.grammar.ratio,
    sectionScores.vocabulary.ratio,
    sectionScores.reading.ratio,
    sectionScores.functional.ratio,
    sectionScores.writing.ratio,
  );
  const minSectionRatio = Math.min(
    sectionScores.grammar.ratio,
    sectionScores.vocabulary.ratio,
    sectionScores.reading.ratio,
    sectionScores.functional.ratio,
    sectionScores.writing.ratio,
  );
  if (maxSectionRatio - minSectionRatio >= 0.45) {
    manualReviewReasons.push("highSectionVariance");
  }

  const needsManualReview = manualReviewReasons.length > 0;

  return {
    level,
    earned: totalEarned,
    max,
    sectionScores,
    strengths,
    improvements,
    writingFeedback: writing.feedbackCodes,
    needsManualReview,
    manualReviewReasons,
  };
}
