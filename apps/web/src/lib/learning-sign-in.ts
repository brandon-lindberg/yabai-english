import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { getRequestLearningSite } from "@/lib/learning-site-request";
import { learningCookieOptions, rememberGuestLearningLanguage } from "@/lib/learning-language-request";
import { journeyIntentSchema, JOURNEY_INTENT_SECONDS, journeyCallback, signInIntentCookieName } from "@/lib/learning-journey";

const LEARNING_CALLBACK_PATH = "/api/auth/learning-journey";

export async function prepareLearningSignIn(input: { learningLanguage: LearningLanguage; locale: string; callbackUrl: string; retried?: boolean; signup?: true }) {
  const site = await getRequestLearningSite();
  if (site?.learningLanguage && site.learningLanguage !== input.learningLanguage) throw new Error("Choose this language on its learning site");
  const intent = journeyIntentSchema.parse({
    ...input,
    callbackUrl: journeyCallback(input.learningLanguage, input.locale, input.callbackUrl),
    expiresAt: Date.now() + JOURNEY_INTENT_SECONDS * 1000,
  });
  const nonce = randomUUID();
  (await cookies()).set(signInIntentCookieName(nonce)!, JSON.stringify(intent), {
    ...learningCookieOptions, secure: site ? new URL(site.origin).protocol === "https:" : learningCookieOptions.secure,
    maxAge: JOURNEY_INTENT_SECONDS,
  });
  await rememberGuestLearningLanguage(intent.learningLanguage);
  return `${LEARNING_CALLBACK_PATH}?intent=${nonce}`;
}

export function parseLearningSignInIntent(raw?: string) {
  try { return journeyIntentSchema.parse(JSON.parse(raw ?? "null")); } catch { return null; }
}

export async function recoverLearningSignInIntent() {
  const store = await cookies();
  const callback = store.get("__Secure-authjs.callback-url")?.value ?? store.get("authjs.callback-url")?.value;
  if (!callback) return null;
  let url: URL;
  try { url = new URL(callback, "http://localhost"); } catch { return null; }
  if (url.pathname !== LEARNING_CALLBACK_PATH) return null;
  const name = signInIntentCookieName(url.searchParams.get("intent") ?? "");
  const intent = name ? parseLearningSignInIntent(store.get(name)?.value) : null;
  return intent && intent.expiresAt > Date.now() ? intent : null;
}
