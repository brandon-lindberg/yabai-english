import { getTranslations } from "next-intl/server";

export async function LandingTrust() {
  const t = await getTranslations("landing");

  return (
    <section className="mt-14 rounded-2xl border border-border bg-[var(--app-chip)] px-5 py-4 sm:px-6">
      <p className="text-sm leading-relaxed text-foreground">{t("trustLine")}</p>
    </section>
  );
}
