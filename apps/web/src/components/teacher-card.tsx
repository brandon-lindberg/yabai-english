import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { TeacherCard as TeacherCardData } from "@/lib/teacher-discovery";
import { buildTeacherCardProfileHref } from "@/lib/teacher-card-href";
import { PaymentMethodLogos } from "@/components/payment-method-logos";
import { buttonClasses } from "@/components/ui/button";
import { formatYen } from "@/lib/format-money";

type Props = {
  teacher: TeacherCardData;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export async function TeacherCard({
  teacher,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  const locale = await getLocale();
  const t = await getTranslations("booking");

  const profileHref = buildTeacherCardProfileHref(
    teacher.id,
    onboardingNext,
    onboardingStep,
  ) as "/book/teachers/[teacherId]";

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-[var(--app-hover)]">
      <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs text-muted">
        {teacher.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.imageUrl} alt={teacher.displayName} className="h-full w-full object-cover" />
        ) : (
          teacher.displayName.slice(0, 2).toUpperCase()
        )}
      </div>
      <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{teacher.displayName}</h2>
      <p className="mt-1 text-sm text-muted">
        {teacher.countryOfOrigin ?? "—"} · {teacher.instructionLanguages.join(", ")}
      </p>
      {teacher.specialties.length > 0 && (
        <p className="mt-2 text-sm text-muted">{teacher.specialties.join(" · ")}</p>
      )}
      <p className="mt-2 text-base font-semibold tabular-nums text-foreground">
        {teacher.rateYen ? formatYen(teacher.rateYen, locale) : "—"}
      </p>
      {/* Was hard-coded English ("N available slots") in a product whose audience
          reads Japanese. Now translated, with the plural handled by ICU in en and
          the 件 counter in ja, matching the conventions already in messages/. */}
      <p className="mt-1 text-xs text-muted">
        {t("teacherCardAvailableSlots", { count: teacher.activeAvailabilityCount })}
      </p>
      <PaymentMethodLogos methods={teacher.paymentMethods ?? []} className="mt-3" />
      <Link href={profileHref} className={`mt-4 ${buttonClasses()}`}>
        {t("teacherCardViewProfile")}
      </Link>
    </article>
  );
}
