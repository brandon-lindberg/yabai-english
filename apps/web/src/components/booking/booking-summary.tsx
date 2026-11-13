import { getLocale, getTranslations } from "next-intl/server";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { Status, type StatusTone } from "@/components/ui/status";
import { formatYen } from "@/lib/format-money";
import type { LearningLanguage, LessonTier } from "@/generated/prisma/enums";
import { LEARNING_JOURNEYS } from "@/lib/learning-journey";
import { lessonProductNames } from "@/lib/lesson-product-catalog";

/**
 * The lesson / when / with whom / how much block, shared by checkout and the
 * success page. It was duplicated markup in both, which is how the two drifted
 * into showing prices differently ("JPY 5,000" vs "¥5,000").
 *
 * The amount is set at display scale because it is the commitment the page is
 * asking for — on checkout it is the decision, on success it is the receipt.
 */
type Props = {
  learningLanguage?: LearningLanguage;
  lessonTier?: LessonTier;
  durationMin?: number;
  lessonNameJa: string;
  lessonNameEn: string;
  startsAtIso: string;
  endsAtIso: string;
  teacherName: string;
  priceYen: number;
  statusTone: StatusTone;
  statusLabel: string;
  /** Success reads as a receipt, so its amount sits a step below checkout's. */
  emphasis?: "primary" | "secondary";
};

export async function BookingSummary({
  lessonNameJa,
  lessonNameEn,
  startsAtIso,
  endsAtIso,
  teacherName,
  priceYen,
  statusTone,
  statusLabel,
  emphasis = "primary",
  learningLanguage = "ENGLISH",
  lessonTier,
  durationMin = 0,
}: Props) {
  const locale = await getLocale();
  const td = await getTranslations("dashboard");
  const j = await getTranslations("learningJourney");
  const names = lessonProductNames({ nameJa: lessonNameJa, nameEn: lessonNameEn, tier: lessonTier, durationMin }, learningLanguage);

  const amountClass =
    emphasis === "primary"
      ? "text-[clamp(2rem,6vw,3.25rem)]"
      : "text-[clamp(1.75rem,5vw,2.75rem)]";

  return (
    <>
      <section className="mt-8 border-t border-border pt-6">
        <p className="text-lg font-bold tracking-[-0.02em] text-foreground">
          {j(`${LEARNING_JOURNEYS[learningLanguage].key}.name`)} · {names.nameJa} / {names.nameEn}
        </p>

        {/*
          Formatted client-side in the viewer's own timezone. Both pages
          previously called `startsAt.toLocaleString()` in a server component,
          with no locale and no zone, so a student in Japan was shown the
          server's UTC wall time for their lesson on the page where they pay.
        */}
        <LocalBookingDateTimeRange
          locale={locale}
          startsAtIso={startsAtIso}
          endsAtIso={endsAtIso}
          className="mt-1 block text-base tabular-nums text-muted"
        />

        <p className="mt-1 text-base text-muted">
          {td("teacher")}: {teacherName}
        </p>
      </section>

      <section className="mt-6 border-t border-border pt-6">
        <p
          className={`${amountClass} font-black leading-none tracking-[-0.035em] tabular-nums text-foreground`}
        >
          {formatYen(priceYen, locale)}
        </p>
        <div className="mt-4">
          <Status tone={statusTone}>{statusLabel}</Status>
        </div>
      </section>
    </>
  );
}
