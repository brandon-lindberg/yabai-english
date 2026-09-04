"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Choice, ChoiceList } from "@/components/ui/choice";
import { Input } from "@/components/ui/field";
import {
  LEARNING_GOALS,
  LEARNING_GOALS_NOTE_MAX_CHARS,
  normalizeLearningGoals,
} from "@/lib/student-learning-goals";

/**
 * What a student is studying for: the fixed goals, plus one in their own words.
 *
 * Shared by the onboarding wizard and the student's own profile. They asked the
 * same question with two copies of the same markup — which is how the profile
 * came to allow editing while the wizard's answer was frozen, and how the
 * free-text goal would otherwise have had to be built twice.
 *
 * The presets are a multi-select, not a choice: someone can be studying for an
 * exam and for a trip at the same time. And they cover the common cases and
 * nothing else, so "pass N2 by March" or "talk to my in-laws" needs somewhere
 * to go.
 */
export function LearningGoalsPicker({
  goals,
  note,
  onChange,
}: {
  goals: readonly string[];
  note: string;
  onChange: (next: { goals: string[]; note: string }) => void;
}) {
  const t = useTranslations("onboarding");
  const noteId = useId();

  const toggle = (id: string) =>
    onChange({
      goals: normalizeLearningGoals(
        goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id],
      ),
      note,
    });

  return (
    <div className="space-y-3">
      <ChoiceList columns={2}>
        {LEARNING_GOALS.map((goal) => (
          <Choice
            key={goal.id}
            toggle
            state={goals.includes(goal.id) ? "selected" : "idle"}
            onSelect={() => toggle(goal.id)}
          >
            {t(goal.labelKey)}
          </Choice>
        ))}
      </ChoiceList>

      <div>
        <label htmlFor={noteId} className="block text-sm text-muted">
          {t("goalOtherLabel")}
        </label>
        <Input
          id={noteId}
          value={note}
          // Capped here as well as at the API: the column is 200, and a
          // student should meet the limit while typing rather than lose the
          // end of a sentence on save.
          maxLength={LEARNING_GOALS_NOTE_MAX_CHARS}
          placeholder={t("goalOtherPlaceholder")}
          onChange={(e) => onChange({ goals: [...goals], note: e.target.value })}
          className="mt-1"
        />
      </div>
    </div>
  );
}
