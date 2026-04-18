import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const t = await getTranslations("common");
  const legal = await getTranslations("legal");

  return (
    <footer
      className="mt-auto border-t border-border bg-[var(--app-surface)]"
      aria-label={t("footerAria")}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-8 text-center text-xs text-muted sm:px-6">
        <span className="text-muted">{t("footerCopyright", { year })}</span>
        <Link
          href="/contact"
          className="font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("footerContact")}
        </Link>
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
          <Link
            href="/legal/terms"
            className="font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {legal("footerTermsLink")}
          </Link>
          <span aria-hidden="true" className="text-muted/80">
            &
          </span>
          <Link
            href="/legal/privacy"
            className="font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {legal("footerPrivacyLink")}
          </Link>
        </span>
      </div>
    </footer>
  );
}
