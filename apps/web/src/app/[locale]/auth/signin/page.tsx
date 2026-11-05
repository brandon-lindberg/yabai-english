import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { redirect as redirectAbsolute } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { redirect } from "@/i18n/navigation";
import { getAuthMode } from "@/lib/auth-mode";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import { resolveAuthErrorKind } from "@/lib/auth-error-kind";
import { getLocale, getTranslations } from "next-intl/server";
import { learningLanguageSchema } from "@/lib/learning-language";
import { getGuestLearningLanguage, getRequestLearningLanguage } from "@/lib/learning-language-request";
import { LearningChoice } from "@/components/marketing/learning-choice";
import { journeyCallback, LEARNING_JOURNEYS } from "@/lib/learning-journey";
import { selectLearningJourney } from "@/lib/learning-journey-actions";
import { buttonClasses } from "@/components/ui/button";
import { SITE_SESSION_SKIP, siteSessionStartHref } from "@/lib/site-session-path";

type Search = { callbackUrl?: string; error?: string; learningLanguage?: string; siteSession?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  const locale = await getLocale();
  const { callbackUrl: rawCallback, error: rawError, learningLanguage: rawLanguage, siteSession } = await searchParams;
  const site = await getRequestLearningSite();
  const sites = configuredLearningSites();
  const requested = learningLanguageSchema.safeParse(rawLanguage);
  if (sites && site?.learningLanguage && requested.success && site.learningLanguage !== requested.data) {
    redirectAbsolute(learningSiteHref(sites, requested.data, appPathForLocale(locale, `/auth/signin?learningLanguage=${requested.data}`)));
  }
  if (!session && !requested.success && !await getGuestLearningLanguage()) {
    return <LearningChoice forSignIn callbackUrl={resolveSafeCallbackUrl(rawCallback, "/book")} />;
  }
  const learningLanguage = site?.learningLanguage ?? (requested.success ? requested.data : await getRequestLearningLanguage(session));
  if (session) {
    if (session.user.role === "STUDENT" && requested.success && requested.data !== session.user.learningLanguage) {
      const j = await getTranslations("learningJourney");
      return <main className="flex flex-1 flex-col"><AuthPageShell>
        <h1 className="text-3xl font-black tracking-[-0.04em]">{j(`${LEARNING_JOURNEYS[learningLanguage].key}.start`)}</h1>
        <p className="mt-4 text-muted">{j("signinIntro")}</p>
        <form className="mt-8" action={selectLearningJourney.bind(null, learningLanguage, locale)}><button className={buttonClasses({ size: "lg" })}>{j(`${LEARNING_JOURNEYS[learningLanguage].key}.browse`)}</button></form>
      </AuthPageShell></main>;
    }
    redirect({ href: "/dashboard", locale });
  }

  const safePostLoginPath = journeyCallback(learningLanguage, locale, resolveSafeCallbackUrl(rawCallback, "/book"));
  if (site?.learningLanguage && !rawError && siteSession !== SITE_SESSION_SKIP) {
    redirectAbsolute(siteSessionStartHref(site, "signin", locale, safePostLoginPath));
  }
  // `pages.error` in auth.ts points here, so Auth.js redirects failed sign-ins back
  // with `?error=<type>`. The value is attacker-controllable, so it only ever selects
  // a message — it is never rendered.
  const authError = resolveAuthErrorKind(rawError);

  const { hasGoogleOAuth, devEmailSignIn } = getAuthMode();

  return (
    <main className="flex flex-1 flex-col">
      <AuthPageShell>
        <SignInForm
          hasGoogleOAuth={hasGoogleOAuth}
          devEmailSignIn={devEmailSignIn}
          safePostLoginPath={safePostLoginPath}
          authError={authError}
          learningLanguage={learningLanguage}
        />
      </AuthPageShell>
    </main>
  );
}
