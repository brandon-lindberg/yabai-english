"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

type Props = {
  hasGoogleOAuth: boolean;
  devEmailSignIn: boolean;
};

export function SignInForm({ hasGoogleOAuth, devEmailSignIn }: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo =
    locale === "ja" ? "/dashboard" : `/${locale}/dashboard`;

  async function onDevSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        redirect: false,
        redirectTo,
      });
      if (res?.error) {
        setError(t("devSignInError"));
        return;
      }
      if (res?.ok) {
        window.location.assign(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("signInTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("signInSubtitle")}</p>
      </div>

      {registered && (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--app-success-border)",
            background: "var(--app-success-bg)",
            color: "var(--app-success-text)",
          }}
          role="status"
        >
          {t("afterSignUp")}
        </p>
      )}

      {hasGoogleOAuth && (
        <button
          type="button"
          onClick={() => void signIn("google", { redirectTo })}
          className="flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("continueWithGoogle")}
        </button>
      )}

      {devEmailSignIn && (
        <form onSubmit={onDevSubmit} className="space-y-4">
          <p
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: "var(--app-warn-border)",
              background: "var(--app-warn-bg)",
              color: "var(--app-warn-text)",
            }}
          >
            {t("devOnlyHint")}{" "}
            <span className="font-mono">{t("devSeedTeacherEmail")}</span>
          </p>
          <label className="block text-sm font-medium text-foreground">
            {t("email")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="you@example.com"
            />
          </label>
          {error && (
            <p className="text-sm" style={{ color: "var(--app-danger)" }} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : t("signInWithEmail")}
          </button>
        </form>
      )}

      {!hasGoogleOAuth && !devEmailSignIn && (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {t("misconfigured")}
        </p>
      )}

      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/auth/signup" className="font-medium text-link hover:underline">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
