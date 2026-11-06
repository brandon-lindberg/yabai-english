import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleSignInForm } from "@/components/auth/google-sign-in-form";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isGoogleSignInConfigured } from "@/lib/auth-mode";
import { authErrorHref } from "@/lib/auth-error-kind";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { LEARNING_JOURNEYS, journeyCallback, journeyPath, journeySignInHref } from "@/lib/learning-journey";
import { startGoogleSignIn } from "@/lib/learning-journey-actions";
import { learningLanguageSchema } from "@/lib/learning-language";
import { getGuestLearningLanguage } from "@/lib/learning-language-request";
import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { SITE_SESSION_SKIP, siteSessionStartHref } from "@/lib/site-session-path";

type SignInQuery = { callbackUrl?: string; error?: string; learningLanguage?: string; siteSession?: string; signup?: string };

export default async function SignInPage({ searchParams }: { searchParams: Promise<SignInQuery> }) {
  const locale = await getLocale();
  const query = await searchParams;
  const signup = query.signup === "1";
  const local = (path: string) => appPathForLocale(locale, path);
  if (query.error) redirect(local(authErrorHref(query.error)));

  const site = await getRequestLearningSite();
  const sites = configuredLearningSites();
  const requested = learningLanguageSchema.safeParse(query.learningLanguage);
  const callbackUrl = resolveSafeCallbackUrl(query.callbackUrl, "/book");
  if (sites && requested.success && site?.learningLanguage !== requested.data) {
    redirect(learningSiteHref(sites, requested.data, local(journeySignInHref(requested.data, callbackUrl, signup))));
  }
  const session = await auth();
  if (session) {
    if (session.user.role === "STUDENT" && requested.success && requested.data !== session.user.learningLanguage) {
      redirect(local(journeyPath(requested.data)));
    }
    redirect(local("/dashboard"));
  }

  const learningLanguage = site?.learningLanguage ?? (requested.success ? requested.data : await getGuestLearningLanguage());
  if (!learningLanguage) redirect(local(`/choose-language?${new URLSearchParams({ signIn: "1", callbackUrl, ...(signup ? { signup: "1" } : {}) })}`));
  const safePostLoginPath = journeyCallback(learningLanguage, locale, callbackUrl);
  if (site?.learningLanguage && query.siteSession !== SITE_SESSION_SKIP) {
    redirect(siteSessionStartHref(site, signup ? "signup" : "signin", locale, safePostLoginPath));
  }
  if (!isGoogleSignInConfigured()) redirect(local(authErrorHref("SignInUnavailable")));

  const t = await getTranslations("auth");
  const j = await getTranslations("learningJourney");
  return (
    <main className="flex flex-1 flex-col">
      <AuthPageShell>
        <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{j(`${LEARNING_JOURNEYS[learningLanguage].key}.signin`)}</h1>
        <p className="mt-3 text-muted">{t("signInSubtitle")}</p>
        <div className="mt-6 space-y-3">
          <GoogleSignInForm
            label={t("continueWithGoogle")}
            pendingLabel={t("signingIn")}
            action={startGoogleSignIn.bind(null, { learningLanguage, locale, callbackUrl: safePostLoginPath, ...(signup ? { signup: true } : {}) })}
          />
          <Link href="/" className={buttonClasses({ variant: "ghost" })}>{t("backToHome")}</Link>
        </div>
      </AuthPageShell>
    </main>
  );
}
