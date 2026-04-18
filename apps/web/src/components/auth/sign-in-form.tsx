"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";

type Props = {
  hasGoogleOAuth: boolean;
  devEmailSignIn: boolean;
  /** Server-validated path (+ optional query) after successful sign-in. */
  safePostLoginPath: string;
};

export function SignInForm({ hasGoogleOAuth, devEmailSignIn, safePostLoginPath }: Props) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onDevSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        redirect: false,
        redirectTo: safePostLoginPath,
      });
      if (res?.error) {
        setError(t("devSignInError"));
        return;
      }
      if (res?.ok) {
        window.location.assign(safePostLoginPath);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("signInTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("signInSubtitle")}</p>
        {hasGoogleOAuth ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("googleIntro")}</p>
        ) : null}
      </div>

      {devEmailSignIn && (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--app-warn-border)",
            background: "var(--app-warn-bg)",
            color: "var(--app-warn-text)",
          }}
          role="status"
        >
          {t("devBypassBanner")}
        </p>
      )}

      {hasGoogleOAuth && (
        <button
          type="button"
          onClick={() => {
            setGoogleLoading(true);
            void signIn("google", { redirectTo: safePostLoginPath });
          }}
          disabled={googleLoading}
          aria-busy={googleLoading}
          aria-label="Sign in with Google"
          className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:bg-[#f8f9fa] hover:shadow-md active:translate-y-0 active:scale-[0.99] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75 dark:bg-[var(--app-elevated)] dark:text-foreground dark:hover:bg-[var(--app-hover)]"
        >
          {googleLoading ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#1f1f1f]/20 border-t-[#1f1f1f] dark:border-foreground/20 dark:border-t-foreground"
            />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 transition-transform duration-150 group-hover:scale-110"
            >
              <path
                d="M21.35 11.1H12v2.98h5.36c-.23 1.5-1.8 4.4-5.36 4.4-3.23 0-5.86-2.67-5.86-5.97s2.63-5.97 5.86-5.97c1.84 0 3.07.79 3.78 1.47l2.58-2.5C16.72 3.98 14.56 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9 8.69-3.48 8.69-8.39c0-.56-.06-.99-.14-1.51z"
                fill="#4285F4"
              />
              <path
                d="M6.55 14.27 5.9 16.1 4.1 16.14A8.98 8.98 0 0 1 3 12c0-1.45.34-2.82.95-4.03h.01l1.6.29.7 1.58A5.41 5.41 0 0 0 6 12c0 .8.2 1.55.55 2.27z"
                fill="#34A853"
              />
              <path
                d="M12 21c-3.45 0-6.43-1.95-7.9-4.86l2.45-1.87A5.97 5.97 0 0 0 12 18.48c1.71 0 3.14-.58 4.19-1.58l2.63 2.03C17.2 20.24 14.76 21 12 21z"
                fill="#FBBC05"
              />
              <path
                d="M18.94 5.66 16.5 7.55A5.3 5.3 0 0 0 12 5.52a5.97 5.97 0 0 0-5.45 3.72L3.95 7.2A9 9 0 0 1 12 3c2.63 0 4.84.96 6.94 2.66z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{googleLoading ? t("signingIn") : t("continueWithGoogle")}</span>
        </button>
      )}

      {!hasGoogleOAuth && !devEmailSignIn && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          role="alert"
          style={{
            borderColor: "var(--app-danger)",
            color: "var(--app-danger)",
            background: "var(--app-warn-bg)",
          }}
        >
          {t("misconfigured")}
        </div>
      )}

      {devEmailSignIn && (
        <div className="border-t border-border pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("devSectionLabel")}
          </p>
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
        </div>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm font-medium text-link hover:underline">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
