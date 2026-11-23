"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { Section } from "@/components/ui/section";
import { studyStreakModes, type StudyStreakPreference } from "@/lib/study/streak-preference";

const weeklyGoals = Array.from({ length: 7 }, (_, index) => index + 1);

export function StudyStreakSettings({ initial }: { initial: StudyStreakPreference }) {
  const t = useTranslations("dashboard.studyStreak");
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const visibilityHintId = useId();
  const changed = saved.enabled !== draft.enabled || saved.mode !== draft.mode || saved.weeklyGoal !== draft.weeklyGoal;

  function updateDraft(update: Partial<StudyStreakPreference>) {
    setDraft(current => ({ ...current, ...update }));
    setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || status === "saving") return;
    setStatus("saving");
    try {
      const response = await fetch("/api/student/study-streak", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error("Study streak preference could not be saved");
      setSaved(draft);
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <Section title={t("title")} description={t("studyDay")} ruled={false}>
      <form onSubmit={submit} className="max-w-sm">
        <fieldset disabled={status === "saving"} className="space-y-4">
          <div>
            <label className="relative flex min-h-11 items-center justify-between gap-4 font-medium">
              {t("show")}
              <input
                type="checkbox"
                role="switch"
                className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                aria-describedby={visibilityHintId}
                checked={draft.enabled}
                onChange={event => updateDraft({ enabled: event.target.checked })}
              />
              <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full border border-muted bg-surface after:absolute after:start-[3px] after:top-[3px] after:size-4 after:rounded-full after:bg-foreground peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-5 peer-checked:after:bg-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground peer-disabled:opacity-40" />
            </label>
            <p id={visibilityHintId} className="text-sm text-muted">{t("visibilityHint")}</p>
          </div>
          {draft.enabled && <Field label={t("cadence")} hint={t(`hint.${draft.mode}`)}>
            {attributes => <Select {...attributes} value={draft.mode} onChange={event => {
              const mode = studyStreakModes.find(value => value === event.target.value);
              if (!mode) return;
              updateDraft({ mode });
            }}>
              {studyStreakModes.map(mode => <option key={mode} value={mode}>{t(`mode.${mode}`)}</option>)}
            </Select>}
          </Field>}
          {draft.enabled && draft.mode === "WEEKLY" && (
            <Field label={t("weeklyGoal")}>
              {attributes => <Select {...attributes} value={draft.weeklyGoal} onChange={event => updateDraft({ weeklyGoal: Number(event.target.value) })}>
                {weeklyGoals.map(goal => <option key={goal} value={goal}>{t("goalDays", { count: goal })}</option>)}
              </Select>}
            </Field>
          )}
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!changed || status === "saving"}>{t("save")}</Button>
          <FormStatus state={status} savingLabel={t("saving")} savedLabel={t("saved")} errorLabel={t("saveError")} />
        </div>
      </form>
    </Section>
  );
}
