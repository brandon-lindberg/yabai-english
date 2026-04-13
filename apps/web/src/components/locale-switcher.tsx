"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(nextLocale: "ja" | "en") {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div
      className="grid w-full grid-cols-2 items-center rounded-full border border-border bg-surface p-0.5"
      role="group"
      aria-label={t("locale")}
    >
      <button
        type="button"
        onClick={() => setLocale("ja")}
        aria-pressed={locale === "ja"}
        className={`rounded-full px-3 py-1 text-center text-xs font-semibold transition ${
          locale === "ja"
            ? "bg-primary text-primary-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        日本語
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-3 py-1 text-center text-xs font-semibold transition ${
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        English
      </button>
    </div>
  );
}
