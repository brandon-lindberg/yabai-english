import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function LandingHero() {
  const t = await getTranslations("landing");
  const h = await getTranslations("home");

  return (
    <section className="rounded-3xl border border-border bg-[var(--app-surface)] px-6 py-12 shadow-sm sm:px-10">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("heroTitle")}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{t("heroSubtitle")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/auth/signin"
          className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {h("ctaSignIn")}
        </Link>
        <Link
          href="/book"
          className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
        >
          {h("ctaBrowseTeachers")}
        </Link>
      </div>
    </section>
  );
}
