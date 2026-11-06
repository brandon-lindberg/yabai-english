import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { authSignInHref } from "@/lib/auth-sign-in-href";
import { journeySignInHref } from "@/lib/learning-journey";
import { learningLanguageSchema } from "@/lib/learning-language";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ learningLanguage?: string; callbackUrl?: string }> }) {
  const locale = await getLocale();
  const { learningLanguage, callbackUrl = "/book" } = await searchParams;
  const subject = learningLanguageSchema.safeParse(learningLanguage);
  redirect({ href: subject.success ? journeySignInHref(subject.data, callbackUrl, true) : authSignInHref(callbackUrl, "/book", true), locale });
}
