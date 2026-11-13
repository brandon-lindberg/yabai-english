"use client";
import { useTranslations } from "next-intl";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
export function JapaneseAssessmentSkeleton() {
  const t = useTranslations("japanesePlacement");
  return <div role="status" aria-label={t("loading")} className="space-y-6 border-t border-border py-6">
    <span className="sr-only">{t("loading")}</span><Skeleton height="3" /><SkeletonText lines={2} />
    <div className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} height="12" rounded="xl" />)}</div>
  </div>;
}
