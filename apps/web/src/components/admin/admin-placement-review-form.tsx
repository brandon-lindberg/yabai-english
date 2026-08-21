"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { MarkdownField } from "@/components/ui/markdown-field";
import { PLACEMENT_NOTE_MAX_CHARS } from "@/lib/markdown/limits";
import { FormStatus, type SaveState } from "@/components/ui/form-status";

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
type Level = (typeof LEVELS)[number];

/**
 * Triage one student's placement, from the queue.
 *
 * Was a grey box nested inside each row — a card inside a list inside a card —
 * holding a raw `<select>`, a raw `<textarea>` and a hand-styled button, none of
 * them labelled. The level control announced nothing at all, so the whole form
 * was three unlabelled widgets repeated once per student.
 *
 * It also lived under `components/` while every other admin component sits in
 * `components/admin/`, which is why the admin sweep kept missing it.
 */
export function AdminPlacementReviewForm({
  studentId,
  studentName,
  currentLevel,
}: {
  studentId: string;
  /** Names the controls, so a queue of ten is not ten identical "Level" fields. */
  studentName: string;
  currentLevel: "UNSET" | Level;
}) {
  const t = useTranslations("admin.placementReview");
  const router = useRouter();
  const [level, setLevel] = useState<Level>(
    currentLevel === "UNSET" ? "BEGINNER" : currentLevel,
  );
  const [note, setNote] = useState("");
  const [state, setState] = useState<SaveState>("idle");

  async function submit() {
    setState("saving");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/placement-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placedLevel: level, adminNote: note }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field
        label={t("levelLabel", { name: studentName })}
        hideLabel
        className="sm:w-44"
      >
        {(field) => (
          <Select
            {...field}
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`level.${l}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <MarkdownField
        label={t("noteLabel", { name: studentName })}
        hideLabel
        className="min-w-0 flex-1"
        value={note}
        maxChars={PLACEMENT_NOTE_MAX_CHARS}
        placeholder={t("notePlaceholder")}
        size="sm"
        minHeightClass="[&_.mdxeditor-root-contenteditable]:min-h-[72px]"
        onChange={setNote}
      />

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void submit()}
          loading={state === "saving"}
          variant="secondary"
        >
          {t("apply")}
        </Button>
        <FormStatus
          state={state}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          errorLabel={t("error")}
        />
      </div>
    </div>
  );
}
