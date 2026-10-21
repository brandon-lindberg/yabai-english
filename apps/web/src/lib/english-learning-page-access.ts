import { redirect } from "@/i18n/navigation";
import { resolveLearningLanguage } from "@/lib/learning-language";

/** Keep the English assessment and study trees behind the same subject boundary. */
export function requireEnglishLearningPage(learningLanguage: unknown, locale: string) {
  if (resolveLearningLanguage(learningLanguage) !== "ENGLISH") {
    redirect({ href: "/book", locale });
  }
}
