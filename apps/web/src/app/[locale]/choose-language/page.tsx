import { LearningChoice } from "@/components/marketing/learning-choice";

export default async function ChooseLanguagePage({ searchParams }: { searchParams: Promise<{ signIn?: string; callbackUrl?: string; signup?: string }> }) {
  const query = await searchParams;
  return <LearningChoice forSignIn={query.signIn === "1"} callbackUrl={query.callbackUrl} signup={query.signup === "1"} />;
}
