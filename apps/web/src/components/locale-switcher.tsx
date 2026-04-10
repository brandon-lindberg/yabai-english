"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ChangeEvent } from "react";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: e.target.value });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">{t("locale")}</span>
      <select
        value={locale}
        onChange={onChange}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
        aria-label={t("locale")}
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
