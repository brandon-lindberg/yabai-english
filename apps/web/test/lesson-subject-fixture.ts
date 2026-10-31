/** One legacy shared product, two immutable booking subjects. No provider credentials. */
export const conversationProduct = { id: "conversation-60", tier: "EIKAWA" as const, durationMin: 60, nameJa: "英会話", nameEn: "Conversation (Eikawa)" };
export const lessonSubjectCases = [
  { learningLanguage: "ENGLISH", otherLanguage: "JAPANESE", nameJa: "英会話", nameEn: "Conversation (Eikawa)" },
  { learningLanguage: "JAPANESE", otherLanguage: "ENGLISH", nameJa: "日本語会話（60分）", nameEn: "Japanese conversation — 60 min" },
] as const;
