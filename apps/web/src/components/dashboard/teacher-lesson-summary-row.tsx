"use client";

import { useTranslations } from "next-intl";
import { DataRow } from "@/components/ui/data-row";
import { InlineAlert } from "@/components/ui/inline-alert";
import { buttonClasses } from "@/components/ui/button";
import { groupMeetAdvisory } from "@/lib/group-lesson-meet-limits";
import { collectedWhenFullYen } from "@/lib/group-lesson-pricing";
import type { AddedOffering, TaxonomyOption } from "@/components/dashboard/teacher-lesson-add-modal";

/**
 * One class, as a line in a list.
 *
 * The row used to be the editor: six controls per class, including a
 * two-option toggle for which figure the price is. That toggle needs enough
 * room to show both options, and at that size it dominated the row it was
 * describing. So the row reads, and the dialog edits — which is also why the
 * list is now scannable, since every line is the same shape.
 */
export function TeacherLessonSummaryRow({
  offering,
  classLevels,
  classTypes,
  locale,
  onEdit,
  onRemove,
  removing = false,
}: {
  offering: AddedOffering;
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
  locale: string;
  onEdit: () => void;
  onRemove: () => void;
  removing?: boolean;
}) {
  const t = useTranslations("dashboard.profilePage");

  function pickLabel(options: TaxonomyOption[], id: string | null) {
    const option = options.find((o) => o.id === id);
    if (!option) return "—";
    return locale.toLowerCase().startsWith("ja")
      ? (option.labelJa ?? option.labelEn)
      : option.labelEn;
  }

  const meetLimit = offering.isGroup
    ? groupMeetAdvisory({
        durationMin: offering.durationMin,
        capacity: offering.groupSize ?? 0,
      })
    : null;

  const heading = [
    pickLabel(classLevels, offering.classLevelId),
    pickLabel(classTypes, offering.classTypeId),
    `${offering.durationMin} min`,
  ].join(" · ");

  return (
    <DataRow
      actions={
        <>
          <button type="button" onClick={onEdit} className={buttonClasses({ size: "sm" })}>
            {t("teacherUpdateRate")}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("teacherGroupRatesRemove")}
          </button>
        </>
      }
    >
      <p className="text-sm font-semibold text-foreground">{heading}</p>
      <p className="mt-0.5 text-sm tabular-nums text-muted">
        {offering.isGroup && offering.groupSize ? (
          <>
            <span className="font-medium text-foreground">
              {t("teacherGroupPerStudentSummary", {
                perStudent: offering.rateYen.toLocaleString(),
                whenFull: collectedWhenFullYen(
                  offering.rateYen,
                  offering.groupSize,
                ).toLocaleString(),
              })}
            </span>{" "}
            · {t("teacherClassMaxStudents", { count: offering.groupSize })}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">
              ¥{offering.rateYen.toLocaleString()}
            </span>{" "}
            · {t("teacherClassPriceStudentsPay")}
          </>
        )}
      </p>
      {meetLimit ? (
        <InlineAlert variant="warning" className="mt-2">
          {meetLimit.kind === "DURATION_OVER_FREE_LIMIT"
            ? t("teacherGroupMeetLimitOver", {
                limit: meetLimit.limitMin,
                duration: meetLimit.durationMin,
              })
            : meetLimit.kind === "DURATION_AT_FREE_LIMIT"
              ? t("teacherGroupMeetLimitAt", { limit: meetLimit.limitMin })
              : t("teacherGroupMeetLimitCapacity", {
                  limit: meetLimit.limit,
                  participants: meetLimit.participants,
                })}
        </InlineAlert>
      ) : null}
    </DataRow>
  );
}
