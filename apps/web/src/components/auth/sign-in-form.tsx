"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";
import { actionLinkClass } from "@/components/ui/inline-link";

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
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-black leading-[0.95] tracking-[-0.04em] text-foreground">
          {t("signInTitle")}
        </h1>
        <p className="mt-3 text-muted">{t("signInSubtitle")}</p>
        {hasGoogleOAuth ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("googleIntro")}</p>
        ) : null}
      </div>

      {devEmailSignIn && (
        <InlineAlert variant="warning" role="status">
          {t("devBypassBanner")}
        </InlineAlert>
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
          /*
            Google's button keeps its own light chrome in both themes — it is
            their brand mark and must stay legible against it, so the ink here
            is deliberately fixed rather than themed.

            The class list previously contained a bare `hover:` and `active:`,
            left behind when the shadows were stripped. Tailwind emits nothing
            for a variant with no utility, so they were silently dead.
          */
          className="group flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] transition duration-150 ease-out hover:bg-[#f8f9fa] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75 motion-reduce:transition-none"
        >
          {googleLoading ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#1f1f1f]/20 border-t-[#1f1f1f]"
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
        <p role="alert">
          <Status tone="error">{t("misconfigured")}</Status>
        </p>
      )}

      {devEmailSignIn && (
        /* `devSectionLabel` was an uppercase tracked line above the form — an
           eyebrow. It is the section's heading, so it is one. */
        <Section title={t("devSectionLabel")} size="sm">
          <form onSubmit={onDevSubmit} className="space-y-4">
            <InlineAlert variant="warning">
              {t("devOnlyHint")} <span className="font-mono">{t("devSeedTeacherEmail")}</span>
            </InlineAlert>
            <Field label={t("email")} error={error}>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
            </Field>
            <Button type="submit" size="lg" fullWidth loading={loading}>
              {t("signInWithEmail")}
            </Button>
          </form>
        </Section>
      )}

      <p className="text-center">
        <Link href="/" className={`${actionLinkClass} text-sm`}>
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
