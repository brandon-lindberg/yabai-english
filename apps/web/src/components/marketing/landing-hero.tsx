import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { SettleText } from "@/components/ui/settle-text";
import { StormField } from "@/components/marketing/storm-field";

export async function LandingHero() {
  const t = await getTranslations("landing");
  const h = await getTranslations("home");

  return (
    <section className="relative isolate -mx-4 overflow-hidden px-4 pt-10 pb-16 sm:-mx-6 sm:px-6 sm:pt-16 sm:pb-24">
      <StormField />

      {/*
        The headline is the thesis, not a label: it condenses out of the field
        behind it and is the largest thing on the page by a wide margin. No card
        around it — the page itself is the paper.
      */}
      <div className="relative">
        <h1 className="max-w-[16ch] text-[clamp(2.75rem,8vw,6rem)] font-black leading-[0.92] tracking-[-0.04em] text-foreground">
          <SettleText>{t("heroTitle")}</SettleText>
        </h1>

        <p className="mt-7 max-w-[62ch] text-lg leading-relaxed text-muted sm:text-xl">
          {t("heroSubtitle")}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/auth/signin" className={buttonClasses({ size: "lg" })}>
            {h("ctaSignIn")}
          </Link>
          <Link href="/book" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            {h("ctaBrowseTeachers")}
          </Link>
        </div>
      </div>
    </section>
  );
}
