"use client";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Outcome } from "@/components/ui/outcome";
import { ProgressBar } from "@/components/ui/progress-bar";
import { InlineAlert } from "@/components/ui/inline-alert";
import { JapanesePlacementResult } from "./result";
import { SentenceTiles } from "./sentence-tiles";
import { JapaneseAssessmentSkeleton } from "./loading";
import { useJapaneseAssessment } from "./use-assessment";

export function JapanesePlacementAssessment() {
  const t = useTranslations("japanesePlacement");
  const locale = useLocale();
  const state = useJapaneseAssessment();
  const heading = useRef<HTMLHeadingElement>(null);
  const question = state.view?.question;
  const questionId = question?.id;
  useEffect(() => { if (questionId) heading.current?.focus(); }, [questionId]);
  const recovery = <Button onClick={() => void state.retry()} loading={state.busy}>{t("retry")}</Button>;
  const dashboard = <Link href="/dashboard" className={buttonClasses({ variant: "secondary" })}>{t("dashboard")}</Link>;
  const book = <Link href="/book" className={buttonClasses()}>{t("book")}</Link>;
  const errorPanel = state.error ? <InlineAlert role="alert" className="mb-5"><p>{t("network")}</p><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void state.retry()} loading={state.busy}>{t(state.pending ? "retryAnswer" : "retry")}</Button>{state.view ? <Button variant="secondary" onClick={() => void state.refresh()} disabled={state.busy}>{t("loadSaved")}</Button> : null}</div></InlineAlert> : null;
  if (!state.loaded) return <JapaneseAssessmentSkeleton />;
  if (state.error === "BANK_UNAVAILABLE") return <Outcome title={t("unavailableTitle")} description={t("unavailableBody")} actions={<>{book}{recovery}{dashboard}</>} />;
  if (state.error === "ATTEMPT_VERSION_UNSUPPORTED") return <Outcome title={t("updatedTitle")} description={t("updatedBody")} actions={<><Button loading={state.busy} onClick={() => void state.start()}>{t("newStart")}</Button>{dashboard}</>} />;
  if (state.error === "UNAUTHORIZED") return <Outcome title={t("signedOutTitle")} description={t("signedOutBody")} actions={<Link href="/auth/signin" className={buttonClasses()}>{t("signIn")}</Link>} />;
  if (["JAPANESE_STUDENT_REQUIRED", "ACCOUNT_INACTIVE"].includes(state.error ?? "")) return <Outcome title={t("accessTitle")} description={t("accessBody")} actions={dashboard} />;
  if (state.view?.status === "COMPLETED" && state.view.result) return <>{errorPanel}<JapanesePlacementResult result={state.view.result} actions={<>{book}{dashboard}<Button variant="ghost" loading={state.busy} onClick={() => void state.start()}>{t("newStart")}</Button></>} /></>;
  if (!state.view || state.view.status === "ABANDONED") return <div className="border-y border-border py-8">
    <h2 className="text-xl font-bold tracking-tight text-foreground">{t("welcomeTitle")}</h2>
    <p className="mt-3 max-w-prose text-base leading-relaxed text-muted">{t("welcomeBody")}</p>
    <ul className="my-6 space-y-3 text-sm font-medium text-foreground">{["duration", "adaptive", "scope"].map((key) => <li key={key} className="border-b border-border pb-3">{t(key)}</li>)}</ul>
    <p className="mb-6 max-w-prose text-sm leading-relaxed text-muted">{t("startNotice")}</p>
    {errorPanel}
    {state.error ? null : <Button size="lg" loading={state.busy} onClick={() => void state.start()}>{t("start")}</Button>}
  </div>;
  const locked = state.busy || state.pending !== null || state.remaining === 0;
  const progress = t("progress", { current: Math.min(state.view.answered + 1, state.view.total), total: state.view.total });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-t border-border pt-5">
      <p className="text-sm font-medium tabular-nums text-muted">{progress}</p>
      <p role="timer" aria-label={t("timeRemaining")} aria-live="off" className={`text-sm font-semibold tabular-nums ${state.remaining !== null && state.remaining <= 60 ? "text-[var(--app-warn-text)]" : "text-foreground"}`}>
        {t("timeRemaining")}: {state.remaining === null ? "—" : `${Math.floor(state.remaining / 60)}:${String(state.remaining % 60).padStart(2, "0")}`}
      </p>
    </div>
    <ProgressBar percent={state.view.answered / state.view.total * 100} label={progress} valueText={progress} size="sm" />
    {state.remaining !== null && state.remaining > 0 && state.remaining <= 60 ? <p role="status" className="text-sm font-medium text-[var(--app-warn-text)]">{t("timeShort")}</p> : null}
    {state.notice ? <p role="status" className="text-sm text-muted">{t("synced")}</p> : null}
    {question ? <section aria-labelledby="japanese-question-title">
      <h2 id="japanese-question-title" ref={heading} tabIndex={-1} className="scroll-mt-28 text-base font-semibold text-foreground">{locale === "ja" ? question.prompt.ja : question.prompt.en}</h2>
      <p className="mt-4 whitespace-pre-line text-xl font-bold leading-relaxed tracking-tight text-foreground" lang={question.domain === "writing" ? undefined : "ja"}>{question.stimulus.text}</p>
      {question.response.kind === "choice" ? <ChoiceList className="mt-6">{question.response.choices.map((choice) => <Choice key={choice.id} disabled={locked} onSelect={() => void state.submit({ kind: "answer", itemId: question.id, choiceId: choice.id })}><span lang="ja">{choice.text}</span></Choice>)}</ChoiceList>
        : <SentenceTiles key={question.id} tiles={question.response.tiles} disabled={locked} onSubmit={(tileIds) => void state.submit({ kind: "sentence_assembly", itemId: question.id, tileIds })} />}
      <Button variant="ghost" className="mt-4" disabled={locked} onClick={() => void state.submit({ kind: "skip", itemId: question.id, reason: "not_sure" })}>{t("notSure")}</Button>
    </section> : null}
    {errorPanel}
    {state.busy ? <p role="status" className="text-sm text-muted">{t(state.remaining === 0 ? "finishing" : "saving")}</p> : null}
  </div>;
}
