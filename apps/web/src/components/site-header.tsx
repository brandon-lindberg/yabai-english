"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";

export function SiteHeader() {
  const t = useTranslations("common");
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--app-header-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          {t("appName")}
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3">
          {session?.user ? (
            <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Link
                href="/learn/study"
                className="rounded-full px-2.5 py-1 text-sm font-medium text-muted transition hover:bg-[var(--app-hover)] hover:text-foreground"
              >
                {t("learn")}
              </Link>
              {session.user.role === "STUDENT" && session.user.canStartPlacement ? (
                <Link
                  href="/placement"
                  className="rounded-full px-2.5 py-1 text-sm font-medium text-muted transition hover:bg-[var(--app-hover)] hover:text-foreground"
                >
                  {t("placement")}
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-full px-2.5 py-1 text-sm font-medium text-muted transition hover:bg-[var(--app-hover)] hover:text-foreground"
              >
                {t("dashboard")}
              </Link>
              {(session.user.role === "TEACHER" ||
                session.user.role === "ADMIN") && (
                <Link
                  href="/admin"
                  className="rounded-full px-2.5 py-1 text-sm font-medium text-accent transition hover:opacity-90"
                >
                  {t("admin")}
                </Link>
              )}
              <NotificationBell />
              <details className="relative">
                <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-[var(--app-hover)] [&::-webkit-details-marker]:hidden">
                  <span className="sr-only">Menu</span>
                  <span aria-hidden className="text-lg leading-none">
                    ≡
                  </span>
                </summary>
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted">{t("locale")}</p>
                      <LocaleSwitcher />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted">{t("themeToggle")}</p>
                      <ThemeToggle />
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-[var(--app-hover)]"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                </div>
              </details>
            </nav>
          ) : status === "loading" ? (
            <span className="text-sm text-muted">…</span>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
