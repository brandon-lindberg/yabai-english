"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function SignUpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("signUpError"));
        return;
      }
      router.push("/auth/signin?registered=1");
    } catch {
      setError(t("signUpError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("signUpTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("signUpSubtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          {t("displayName")}
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={t("displayNamePlaceholder")}
          />
        </label>
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
          {loading ? "…" : t("createAccount")}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/auth/signin" className="font-medium text-link hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
