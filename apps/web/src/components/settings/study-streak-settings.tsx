"use client";

import { useState, type FormEvent } from "react";
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
  const changed = saved.mode !== draft.mode || saved.weeklyGoal !== draft.weeklyGoal;

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
          <Field label={t("cadence")} hint={t(`hint.${draft.mode}`)}>
            {attributes => <Select {...attributes} value={draft.mode} onChange={event => {
              const mode = studyStreakModes.find(value => value === event.target.value);
              if (!mode) return;
              setDraft({ ...draft, mode });
              setStatus("idle");
            }}>
              {studyStreakModes.map(mode => <option key={mode} value={mode}>{t(`mode.${mode}`)}</option>)}
            </Select>}
          </Field>
          {draft.mode === "WEEKLY" && (
            <Field label={t("weeklyGoal")}>
              {attributes => <Select {...attributes} value={draft.weeklyGoal} onChange={event => {
                setDraft({ ...draft, weeklyGoal: Number(event.target.value) });
                setStatus("idle");
              }}>
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
