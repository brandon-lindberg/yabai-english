"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
export function SiteHeader() {
  const t = useTranslations("common");
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-slate-900">
          {t("appName")}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 sm:gap-4">
          <LocaleSwitcher />
          {session?.user ? (
            <>
              <Link
                href="/learn"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {t("learn")}
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {t("dashboard")}
              </Link>
              {(session.user.role === "TEACHER" ||
                session.user.role === "ADMIN") && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-amber-700 hover:text-amber-900"
                >
                  {t("admin")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("signOut")}
              </button>
            </>
          ) : status === "loading" ? (
            <span className="text-sm text-slate-400">…</span>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {t("signIn")}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
