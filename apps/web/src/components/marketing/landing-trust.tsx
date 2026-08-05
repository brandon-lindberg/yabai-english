import { getTranslations } from "next-intl/server";

export async function LandingTrust() {
  const t = await getTranslations("landing");

  /* The page's close: a ruled footnote, not another panel. */
  return (
    <section className="mt-20 border-t border-border pt-6">
      <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{t("trustLine")}</p>
    </section>
  );
}
