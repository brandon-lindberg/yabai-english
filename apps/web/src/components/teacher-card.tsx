import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { TeacherCard as TeacherCardData } from "@/lib/teacher-discovery";
import { buildTeacherCardProfileHref } from "@/lib/teacher-card-href";
import { PaymentMethodLogos } from "@/components/payment-method-logos";
import { buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DataRow } from "@/components/ui/data-row";
import { formatYen } from "@/lib/format-money";

/**
 * One teacher in the browse list.
 *
 * This was a bordered card in a two-up grid, so choosing a teacher meant
 * comparing figures that never lined up in a column. As a ruled row the rates
 * stack into one right-hand column and can actually be compared down the page —
 * which is the whole job of this screen.
 */

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
    <DataRow
      actions={
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
          <p className="text-right">
            <span className="block text-lg font-black tabular-nums leading-none text-foreground">
              {teacher.rateYen ? formatYen(teacher.rateYen, locale) : "—"}
            </span>
            {/* Was hard-coded English ("N available slots") in a product whose
                audience reads Japanese. ICU handles the plural in en, the 件
                counter in ja. */}
            <span className="mt-1 block text-xs text-muted">
              {t("teacherCardAvailableSlots", { count: teacher.activeAvailabilityCount })}
            </span>
          </p>
          <Link href={profileHref} className={buttonClasses({ size: "sm" })}>
            {t("teacherCardViewProfile")}
          </Link>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <Avatar src={teacher.imageUrl} name={teacher.displayName} size="md" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">
            {teacher.displayName}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {teacher.countryOfOrigin ?? "—"} · {teacher.instructionLanguages.join(", ")}
          </p>
          {teacher.specialties.length > 0 ? (
            <p className="mt-1 text-sm text-muted">{teacher.specialties.join(" · ")}</p>
          ) : null}
          <PaymentMethodLogos methods={teacher.paymentMethods ?? []} className="mt-3" />
        </div>
      </div>
    </DataRow>
  );
}
