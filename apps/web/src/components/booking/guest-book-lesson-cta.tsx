import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";
import { buttonClasses } from "@/components/ui/button";

type Props = {
  /** Validated path (+ query) to return to after sign-in. */
  callbackUrl: string;
};

export async function GuestBookLessonCta({ callbackUrl }: Props) {
  const t = await getTranslations("booking");

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t("scheduleWithTeacher")}</h2>
      <AppCard>
        <p className="text-sm leading-relaxed text-muted">{t("publicBookingTeaser")}</p>
        <Link
          href={{ pathname: "/auth/signin", query: { callbackUrl } }}
          className={buttonClasses({ size: "lg", className: "mt-4" })}
        >
          {t("publicBookingCta")}
        </Link>
      </AppCard>
    </section>
  );
}
