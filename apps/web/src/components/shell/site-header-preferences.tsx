"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeaderPreferences({ labelled = false }: { labelled?: boolean }) {
  const t = useTranslations("common");
  return (
    <div className={labelled ? "space-y-1" : "flex items-center"}>
      {[{ key: "locale", control: <LocaleSwitcher /> }, { key: "themeToggle", control: <ThemeToggle /> }].map(({ key, control }) => (
        <div key={key} className={labelled ? "flex items-center justify-between gap-4 pl-3 text-sm text-muted" : ""}>
          {labelled ? <span>{t(key)}</span> : null}{control}
        </div>
      ))}
    </div>
  );
}
