import { NextResponse } from "next/server";
import { resolveLearningLanguage } from "@/lib/learning-language";

/** Temporary entry guard until independent Japanese assessment/study routes ship. */
export function englishLearningAccessError(learningLanguage: unknown) {
  return resolveLearningLanguage(learningLanguage) === "ENGLISH"
    ? null
    : NextResponse.json(
        { error: "This resource is for learning English.", code: "LEARNING_LANGUAGE_MISMATCH" },
        { status: 403 },
      );
}
