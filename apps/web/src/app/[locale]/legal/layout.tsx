import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <nav
        aria-label={t("navAria")}
        className="mb-8 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-4 text-sm"
      >
        <Link
          href="/legal/terms"
          className="font-medium text-foreground underline-offset-4 hover:text-link hover:underline"
        >
          {t("navTerms")}
        </Link>
        <Link
          href="/legal/privacy"
          className="font-medium text-foreground underline-offset-4 hover:text-link hover:underline"
        >
          {t("navPrivacy")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
