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
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {question.cefrBand} · {question.section} · {question.id}
      </p>
      <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {placementTextToReact(question.instructionEn)}
      </p>
      <p className="mt-2 text-base text-neutral-900 dark:text-neutral-100">
        {placementTextToReact(question.questionEn)}
      </p>
      {showJapanese ? (
        <>
          <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {placementTextToReact(question.instructionJa)}
          </p>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {placementTextToReact(question.questionJa)}
          </p>
        </>
      ) : null}
      <ul className="mt-3 list-inside list-decimal space-y-1 text-sm text-neutral-800 dark:text-neutral-200">
        {question.optionsEn.map((opt, i) => (
          <li key={i}>{placementTextToReact(opt)}</li>
        ))}
      </ul>
      {showCorrectIndex && correctIndex !== undefined ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Correct index (review): {correctIndex}</p>
      ) : null}
    </article>
  );
}
