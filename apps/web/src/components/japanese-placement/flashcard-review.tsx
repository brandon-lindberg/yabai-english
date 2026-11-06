"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { JapaneseReviewDeck } from "@/components/study/japanese-review-deck";
import { Button, buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { japaneseStudyReviewPreviewSchema, type JapaneseStudyReviewPreview } from "@/lib/study/japanese-public";

export function JapanesePlacementFlashcardReview() {
  const t = useTranslations("japanesePlacement");
  const study = useTranslations("study");
  const [preview, setPreview] = useState<JapaneseStudyReviewPreview | "unavailable" | "failed" | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/japanese-study/review-preview", { signal: controller.signal });
        const data = response.ok ? japaneseStudyReviewPreviewSchema.parse(await response.json())
          : response.status === 503 ? "unavailable" : "failed";
        if (!controller.signal.aborted) setPreview(data);
      } catch {
        if (!controller.signal.aborted) setPreview("failed");
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  return <section aria-labelledby="japanese-placement-flashcard-review">
    <h2 id="japanese-placement-flashcard-review" className="text-base font-semibold text-foreground">{t("flashcardReview")}</h2>
    {preview === null ? <div role="status" aria-label={t("flashcardLoading")} aria-busy="true" className="mt-4">
      <Skeleton rounded="2xl" className="mx-auto !h-30 max-w-44 sm:!h-40 sm:max-w-none" />
    </div> : preview === "unavailable" ? <p className="mt-2 text-sm text-muted">{t("flashcardUnavailable")}</p>
      : preview === "failed" ? <div className="mt-2">
        <p role="status" className="text-sm text-muted">{t("flashcardError")}</p>
        <Button variant="secondary" className="mt-2" onClick={() => { setPreview(null); setRetry(count => count + 1); }}>{t("retry")}</Button>
      </div> : <>
        <JapaneseReviewDeck cards={preview.cards} label={t("flashcardReview")} compact />
        <div className="mt-1 flex justify-center sm:mt-2 sm:justify-start">
          <Link className={buttonClasses({ variant: "secondary" })}
            href={`/learn/study/${preview.level}/practice${preview.focus === "weak" ? "?focus=weak" : ""}`}>
            {study("practice")}
          </Link>
        </div>
      </>}
  </section>;
}
