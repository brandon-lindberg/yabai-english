import { placementTextToReact } from "@/lib/placement-question-display";
import type { PlacementQuestionPublic } from "@/lib/placement-test";
import { Status } from "@/components/ui/status";

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
    <article className="border-b border-border py-5">
      {/* Was an uppercase tracked line above the content — an eyebrow, which
          DESIGN.md §4 bans. It is metadata about the item, so it reads beneath
          it in the same weight as everything else that is not the question. */}
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
      <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-foreground">
        {question.optionsEn.map((opt, i) => (
          <li key={i}>{placementTextToReact(opt)}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs tabular-nums text-muted">
        {question.cefrBand} · {question.section} · {question.id}
      </p>
      {showCorrectIndex && correctIndex !== undefined ? (
        <p className="mt-2">
          <Status tone="warn">Correct index (review): {correctIndex}</Status>
        </p>
      ) : null}
    </article>
  );
}
