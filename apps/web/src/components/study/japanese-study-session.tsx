"use client";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Outcome } from "@/components/ui/outcome";
import { Status } from "@/components/ui/status";
import { JapaneseStudyUnavailable } from "./japanese-study-unavailable";
import { StudyPracticeLoading, StudyPromptCard, StudySessionProgress } from "./study-practice-parts";
import { useJapaneseStudySession, type JapaneseStudySessionProps } from "./use-japanese-study-session";
import { describeJapaneseUsage } from "@/lib/study/japanese-usage";

export function JapaneseStudySession(props: JapaneseStudySessionProps) {
  const state = useJapaneseStudySession(props);
  const t = useTranslations("study");
  const jp = useTranslations("japaneseStudy");
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = props.quickReview ? "h3" : "h2";
  const FeedbackHeading = props.quickReview ? "h4" : "h3";
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const questionId = state.current?.id;
  const loading = state.loading;
  useEffect(() => { if (questionId) heading.current?.focus(); }, [questionId, loading]);
  useEffect(() => { if (state.result) feedbackHeading.current?.focus(); }, [state.result]);
  const hub = <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>{t("backToHub")}</Link>;
  if (state.loading) return <StudyPracticeLoading label={jp("loading")} />;
  if (state.error === "unavailable") return <JapaneseStudyUnavailable />;
  if (state.error === "signedOut") return <Outcome title={jp("signedOut")} actions={<Link href="/auth/signin" className={buttonClasses()}>{jp("signIn")}</Link>} />;
  if (state.error === "access") return <Outcome title={jp("accessTitle")} description={jp("accessBody")} actions={hub} />;
  if (state.error === "queue") return <Outcome title={jp("loadError")} actions={<><Button onClick={() => void state.loadQueue()}>{jp("retry")}</Button>{hub}</>} />;
  if (state.finished || (props.quickReview && state.queue && "answered" in state.queue && state.queue.total > 0 && state.queue.answered === state.queue.total)) return <Outcome title={props.quickReview ? jp("dailyDone") : t("sessionDone")} figure={props.quickReview ? undefined : state.score.xp} figureLabel={t("sessionXp", { xp: state.score.xp })}
    description={t("sessionScore", { correct: state.score.correct, wrong: state.score.wrong })}
    actions={<>{props.quickReview ? null : <Button onClick={() => void state.loadQueue(true)}>{jp("anotherSession")}</Button>}{hub}</>}>
    {props.quickReview ? <p className="text-center text-sm tabular-nums text-muted">{jp("todayXp", { xp: state.score.xp })}</p> : null}
    {state.unlocked.length ? <p className="text-center text-sm text-muted">{jp("availableLevels", { levels: state.unlocked.join(locale === "ja" ? "・" : ", ") })}</p> : null}
  </Outcome>;
  if (!state.current) return <Outcome title={t(props.queueFocus === "weak" ? "queueEmptyWeak" : props.queueFocus === "mastered" ? "queueEmptyMastered" : "sessionEmpty")} actions={hub} />;
  const question = state.current;
  const feedback = state.result?.feedback;
  return <div className="space-y-6">
    <StudySessionProgress rpg={state.rpg} index={(state.queue && "answered" in state.queue ? state.queue.answered : 0) + state.index} total={state.queue && "total" in state.queue ? state.queue.total : state.queue!.cards.length} xp={state.score.xp} correct={state.score.correct} wrong={state.score.wrong} showRank={!props.quickReview} xpLabel={props.quickReview ? jp("todayXp", { xp: state.score.xp }) : undefined} />
    <StudyPromptCard label={question.instruction[locale === "ja" ? "ja" : "en"]}>
      <Heading ref={heading} tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none! text-base font-semibold text-foreground">{question.instruction[locale === "ja" ? "ja" : "en"]}</Heading>
      <p lang="ja" className="mt-5 break-words text-4xl font-black leading-relaxed tracking-tight text-foreground sm:text-5xl">{question.stimulus.written}</p>
      {question.stimulus.reading ? <p lang="ja" className="mt-1 text-xl text-foreground">{question.stimulus.reading}</p> : null}
      {question.stimulus.meanings ? <p lang="en" className="mt-3 text-base leading-relaxed text-muted">{question.stimulus.meanings.join("; ")}</p> : null}
      {question.usage.length ? <p className="mt-4 break-words text-sm leading-relaxed text-muted">{jp("usage")}: {question.usage.map((value, index) => {
        const label = describeJapaneseUsage(value, locale);
        return <span key={`${index}:${value}`}>{index ? "; " : ""}<span lang={label.lang}>{label.text}</span></span>;
      })}</p> : null}
    </StudyPromptCard>
    {!state.result ? <ChoiceList columns={2}>{question.choices.map(choice => <Choice key={choice.id} state={state.selected === choice.id ? "selected" : "idle"} disabled={state.locked} onSelect={() => state.choose(choice.id)}>
      <span lang={question.task === "vocabulary_meaning" ? "en" : "ja"} className="break-words">{choice.text}</span>
    </Choice>)}</ChoiceList> : null}
    {state.busy ? <p role="status" className="text-sm text-muted">{jp("saving")}</p> : null}
    {state.error === "save" || state.error === "refresh" ? <InlineAlert role="alert">
      <p>{jp(state.error === "save" ? "saveError" : "refreshError")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => state.error === "save" ? void state.retry() : void state.loadQueue()} loading={state.busy}>{jp(state.error === "save" ? "retrySave" : "fresh")}</Button>{hub}
      </div>
    </InlineAlert> : null}
    {feedback && state.result ? <div role="status" className="space-y-4 border-t border-border pt-5">
      <FeedbackHeading ref={feedbackHeading} tabIndex={-1} className="focus-visible:outline-none! text-base font-semibold text-foreground"><Status tone={state.result.correct ? "settled" : "error"}>{t(state.result.correct ? "feedbackCorrect" : "feedbackWrong")}</Status></FeedbackHeading>
      <dl className="space-y-3 text-sm">
        {feedback.reading ? <div><dt className="text-muted">{jp("reading")}</dt><dd lang="ja" className="mt-1 font-medium text-foreground">{feedback.reading}</dd></div> : null}
        <div><dt className="text-muted">{jp("meanings")}</dt><dd lang="en" className="mt-1 leading-relaxed text-foreground">{feedback.meanings.join("; ")}</dd></div>
        {(["onyomi", "kunyomi", "nanori"] as const).map(category => feedback[category]?.length ? <div key={category}><dt className="text-muted">{jp(category)}</dt><dd lang="ja" className="mt-1 break-words leading-relaxed text-foreground">{feedback[category]!.join(" · ")}</dd></div> : null)}
      </dl>
      {feedback.onyomi || feedback.kunyomi ? <p className="text-xs leading-relaxed text-muted">{jp("notation")}</p> : null}
      <Button onClick={state.next}>{t("nextCard")}</Button>
    </div> : null}
  </div>;
}
