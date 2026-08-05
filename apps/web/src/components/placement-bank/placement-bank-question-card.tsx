import { placementTextToReact } from "@/lib/placement-question-display";
import type { PlacementQuestionPublic } from "@/lib/placement-test";

type PlacementBankQuestionCardProps = {
  question: PlacementQuestionPublic;
  /** When true, show Japanese prompt under English. */
  showJapanese?: boolean;
  /** For internal review only; never send to learners in production quizzes. */
  showCorrectIndex?: boolean;
  correctIndex?: number;
};

/**
 * Presentational card for one placement item — use in review tooling or story-style previews.
 */
export function PlacementBankQuestionCard({
  question,
  showJapanese = true,
  showCorrectIndex = false,
  correctIndex,
}: PlacementBankQuestionCardProps) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {question.cefrBand} · {question.section} · {question.id}
      </p>
      <p className="mt-2 text-sm font-medium text-muted">
        {placementTextToReact(question.instructionEn)}
      </p>
      <p className="mt-2 text-base text-foreground">
        {placementTextToReact(question.questionEn)}
      </p>
      {showJapanese ? (
        <>
          <p className="mt-2 text-sm font-medium text-muted">
            {placementTextToReact(question.instructionJa)}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {placementTextToReact(question.questionJa)}
          </p>
        </>
      ) : null}
      <ul className="mt-3 list-inside list-decimal space-y-1 text-sm text-foreground">
        {question.optionsEn.map((opt, i) => (
          <li key={i}>{placementTextToReact(opt)}</li>
        ))}
      </ul>
      {showCorrectIndex && correctIndex !== undefined ? (
        <p className="mt-2 text-xs text-[var(--app-warn-text)]">Correct index (review): {correctIndex}</p>
      ) : null}
    </article>
  );
}
