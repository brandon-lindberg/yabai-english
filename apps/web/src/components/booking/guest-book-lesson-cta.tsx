import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";

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
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("publicBookingCta")}
        </Link>
      </AppCard>
    </section>
  );
}
