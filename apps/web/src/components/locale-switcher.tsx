"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { InterfaceIcon } from "@/components/ui/interface-icon";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  /*
    next-intl's `usePathname` is the path alone. Replacing with it drops every
    search param on the page — a filter, a wizard's step, whatever the URL was
    holding — so changing the language quietly restarted whatever you were
    doing. The query is carried across explicitly.
  */
  const searchParams = useSearchParams();

  function setLocale(nextLocale: "ja" | "en") {
    router.replace(
      { pathname, query: Object.fromEntries(searchParams.entries()) },
      { locale: nextLocale },
    );
  }

  return (
    <DisclosureMenu label={t("locale")} trigger={<InterfaceIcon name="language" />}>
      <div role="group" aria-label={t("locale")}>
        {([["ja", "日本語"], ["en", "English"]] as const).map(([value, label]) => (
          <button key={value} type="button" lang={value} data-menu-close onClick={() => setLocale(value)} aria-pressed={locale === value}
            className="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg px-3 text-sm text-foreground hover:bg-[var(--app-hover)]">
            {label}{locale === value ? <InterfaceIcon name="check" /> : null}
          </button>
        ))}
      </div>
    </DisclosureMenu>
  );
}
