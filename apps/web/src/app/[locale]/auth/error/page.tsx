import { getLocale, getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleSignInForm } from "@/components/auth/google-sign-in-form";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveAuthErrorKind } from "@/lib/auth-error-kind";
import { isGoogleSignInConfigured } from "@/lib/auth-mode";
import { startGoogleSignIn } from "@/lib/learning-journey-actions";
import { recoverLearningSignInIntent } from "@/lib/learning-sign-in";

export default async function SignInErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const kind = resolveAuthErrorKind(error);
  const intent = await recoverLearningSignInIntent();
  const locale = intent?.locale ?? await getLocale();
  const canRetry = isGoogleSignInConfigured() && kind !== "denied";
  const autoRetry = kind === "retry" && !intent?.retried;

  const t = await getTranslations({ locale, namespace: "auth" });
  const contact = await getTranslations({ locale, namespace: "contact" });
  const j = await getTranslations({ locale, namespace: "learningJourney" });
  const message = kind === "denied" ? t("signInDenied")
    : kind === "journey-expired" ? j("expired")
    : kind === "retry" ? t("signInRetry") : t("signInUnavailable");
  return (
    <main className="flex flex-1 flex-col">
      <AuthPageShell>
        <h1 className="text-3xl font-black tracking-[-0.04em]">{t("signInTitle")}</h1>
        <p role="alert" className="mt-3 text-muted">{message}</p>
        <div className="mt-6 space-y-3">
          {kind === "denied" && <Link className={buttonClasses()} href="/contact" locale={locale}>{contact("title")}</Link>}
          {canRetry && (intent ? (
            <GoogleSignInForm
              autoRetry={autoRetry}
              label={t("continueWithGoogle")}
              pendingLabel={t("signingIn")}
              action={startGoogleSignIn.bind(null, {
                learningLanguage: intent.learningLanguage, locale, callbackUrl: intent.callbackUrl, retried: autoRetry,
              })}
            />
          ) : <Link className={buttonClasses()} href="/auth/signin" locale={locale}>{t("signInTitle")}</Link>)}
          <Link className={buttonClasses({ variant: canRetry ? "ghost" : "secondary" })} href="/" locale={locale}>{t("backToHome")}</Link>
        </div>
      </AuthPageShell>
    </main>
  );
}
