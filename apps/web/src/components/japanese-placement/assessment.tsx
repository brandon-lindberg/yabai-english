"use client";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Outcome } from "@/components/ui/outcome";
import { ProgressBar } from "@/components/ui/progress-bar";
import { InlineAlert } from "@/components/ui/inline-alert";
import { JapanesePlacementFlashcardReview } from "./flashcard-review";
import { JapanesePlacementResult } from "./result";
import { SentenceTiles } from "./sentence-tiles";
import { JapaneseAssessmentSkeleton } from "./loading";
import { japaneseSentenceDraftKey, useJapaneseAssessment } from "./use-assessment";
import { formatCalendarDate } from "@/lib/date-only-in-zone";

export function JapanesePlacementAssessment() {
  const t = useTranslations("japanesePlacement");
  return <><JapanesePlacementAssessmentContent /><p className="mt-3 text-xs text-muted"><a href="/japanese-placement/v3/NOTICE.txt" target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center underline underline-offset-4 hover:text-foreground">{t("sources")}</a></p></>;
}

function JapanesePlacementAssessmentContent() {
  const t = useTranslations("japanesePlacement");
  const placement = useTranslations("placement");
  const locale = useLocale();
  const state = useJapaneseAssessment();
  const heading = useRef<HTMLHeadingElement>(null);
  const question = state.view?.question;
  const questionId = question?.id;
  const questionKey = state.view && questionId ? japaneseSentenceDraftKey(state.view.attemptId, questionId) : "";
  useEffect(() => { if (questionId) heading.current?.focus(); }, [questionId]);
  const recovery = <Button onClick={() => void state.retry()} loading={state.busy}>{t("retry")}</Button>;
  const dashboard = <Link href="/dashboard" className={buttonClasses({ variant: "secondary" })}>{t("dashboard")}</Link>;
  const book = <Link href="/book" className={buttonClasses()}>{t("book")}</Link>;
  const retakeDate = state.view?.status !== "IN_PROGRESS" && state.view?.canStartNewAttempt === false && state.view.retakeEligibleDate
    ? formatCalendarDate(state.view.retakeEligibleDate, locale) : null;
  const errorPanel = state.error ? <InlineAlert role="alert" className="mb-5"><p>{t("network")}</p><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void state.retry()} loading={state.busy}>{t(state.pending ? "retryAnswer" : "retry")}</Button>{state.view ? <Button variant="secondary" onClick={() => void state.refresh()} disabled={state.busy}>{t("loadSaved")}</Button> : null}</div></InlineAlert> : null;
  if (!state.loaded) return <JapaneseAssessmentSkeleton />;
  if (state.error === "BANK_UNAVAILABLE") return <Outcome title={t("unavailableTitle")} description={t("unavailableBody")} actions={<>{book}{recovery}{dashboard}</>} />;
  if (state.error === "ATTEMPT_VERSION_UNSUPPORTED") return <Outcome title={t("updatedTitle")} description={t("updatedBody")} actions={<><Button loading={state.busy} onClick={() => void state.start()}>{t("newStart")}</Button>{dashboard}</>} />;
  if (state.error === "UNAUTHORIZED") return <Outcome title={t("signedOutTitle")} description={t("signedOutBody")} actions={<Link href="/auth/signin" className={buttonClasses()}>{t("signIn")}</Link>} />;
  if (["JAPANESE_STUDENT_REQUIRED", "ACCOUNT_INACTIVE"].includes(state.error ?? "")) return <Outcome title={t("accessTitle")} description={t("accessBody")} actions={dashboard} />;
  if (state.view?.status === "COMPLETED" && state.view.result) {
    const { result, canStartNewAttempt } = state.view;
    const retake = canStartNewAttempt ? <Button variant={result.levelEstimate.status === "estimated" ? "secondary" : "primary"} loading={state.busy} onClick={() => void state.start()}>{t("newStart")}</Button> : null;
    return <>{errorPanel}<JapanesePlacementResult key={result.attemptId} result={result} retakeDate={retakeDate} retakeAction={retake} review={<JapanesePlacementFlashcardReview />} /></>;
  }
  if (retakeDate) return <Outcome title={placement("cooldownTitle")} description={t("retakeFrom", { date: retakeDate })} actions={<>{book}{dashboard}</>} />;
  if (!state.view || state.view.status === "ABANDONED") return <div className="grid border-y border-border sm:grid-cols-2">
    <div className="py-5 sm:py-7 sm:pr-8">
      <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">{t("welcomeTitle")}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("welcomeBody")}</p>
    </div>
    <section aria-labelledby="japanese-placement-instructions" className="border-t border-border py-4 sm:border-l sm:border-t-0 sm:py-7 sm:pl-7">
      <h3 id="japanese-placement-instructions" className="text-base font-semibold text-foreground">{t("beforeYouStart")}</h3>
      <p className="mt-2 text-sm font-semibold text-foreground">{t("duration")}</p>
      <ul className="mt-1.5 list-disc space-y-1.5 ps-4 text-sm leading-relaxed text-muted">
        <li>{t("startNotice")}</li>
        <li>{t("staircaseNotice")}</li>
      </ul>
      <div className="mt-4">
        {errorPanel}
        {state.error ? null : <Button size="lg" loading={state.busy} onClick={() => void state.start()}>{t("start")}</Button>}
      </div>
    </section>
  </div>;
  const locked = state.busy || state.pending !== null || state.remaining === 0;
  const progress = t("progress", { current: Math.min(state.view.answered + 1, state.view.total), total: state.view.total });
  return <div className="space-y-4 border-t border-border pt-3">
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <p className="text-sm font-medium tabular-nums text-muted">{progress}</p>
        <p role="timer" aria-label={t("timeRemaining")} aria-live="off" className={`text-sm font-semibold tabular-nums ${state.remaining !== null && state.remaining <= 60 ? "text-[var(--app-warn-text)]" : "text-foreground"}`}>
          {t("timeRemaining")} · {state.remaining === null ? "—" : `${Math.floor(state.remaining / 60)}:${String(state.remaining % 60).padStart(2, "0")}`}
        </p>
      </div>
      <ProgressBar percent={state.view.answered / state.view.total * 100} label={progress} valueText={progress} size="sm" />
    </div>
    {state.remaining !== null && state.remaining > 0 && state.remaining <= 60 ? <p role="status" className="text-sm font-medium text-[var(--app-warn-text)]">{t("timeShort")}</p> : null}
    {state.notice ? <p role="status" className="text-sm text-muted">{t("synced")}</p> : null}
    {question ? <section aria-labelledby="japanese-question-title" className="max-w-2xl">
      <h2 id="japanese-question-title" ref={heading} tabIndex={-1} className="scroll-mt-28 text-lg font-bold leading-snug text-foreground">{locale === "ja" ? question.prompt.ja : question.prompt.en}</h2>
      <p className="mt-2 whitespace-pre-line wrap-break-word text-lg font-medium leading-relaxed text-foreground sm:text-xl" lang={question.domain === "writing" ? undefined : "ja"}>{question.stimulus.text}</p>
      {question.response.kind === "choice" ? <ChoiceList className="mt-4" columns={question.domain === "reading" ? 1 : 2}>{question.response.choices.map((choice) => <Choice key={choice.id} disabled={locked} onSelect={() => void state.submit({ kind: "answer", itemId: question.id, choiceId: choice.id })}><span lang="ja" className="wrap-break-word">{choice.text}</span></Choice>)}</ChoiceList>
        : <SentenceTiles key={questionKey} draftKey={questionKey} tiles={question.response.tiles} disabled={locked} onSubmit={(tileIds) => void state.submit({ kind: "sentence_assembly", itemId: question.id, tileIds })} />}
      <Button variant="ghost" className="mt-2" disabled={locked} onClick={() => void state.submit({ kind: "skip", itemId: question.id, reason: "not_sure" })}>{t("notSure")}</Button>
    </section> : null}
    {errorPanel}
    {state.busy ? <p role="status" className="text-sm text-muted">{t(state.remaining === 0 ? "finishing" : "saving")}</p> : null}
  </div>;
}
