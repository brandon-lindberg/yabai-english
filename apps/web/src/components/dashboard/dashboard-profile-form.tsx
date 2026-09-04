"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { MarkdownField } from "@/components/ui/markdown-field";
import { ProfileSurface } from "@/components/dashboard/profile-surface";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import type { SaveState } from "@/components/ui/form-status";
import { Field, Input } from "@/components/ui/field";
import { LearningGoalsPicker } from "@/components/learning-goals-picker";
import { LEARNING_GOALS, normalizeLearningGoals } from "@/lib/student-learning-goals";
import type { PlacedLevel } from "@/generated/prisma/enums";

type Props = {
  /** When display name was suggested because profile name was empty */
  showGooglePrefillHint?: boolean;
  initialName: string | null;
  initialShortBio: string | null;
  avatarUrl: string | null;
  postSaveRedirect?: string | null;
  /** See ProfileSurface: `trigger` renders the button and its dialog only. */
  presentation?: "page" | "trigger";
  /**
   * What a teacher reads when planning a lesson, alongside the introduction.
   * Goals were collected once by the onboarding wizard and then frozen, so a
   * student whose aim changed had no way to say so.
   */
  initialLearningGoals?: string[];
  /** A goal in the student's own words, beyond the fixed list. */
  initialLearningGoalsNote?: string | null;
  /**
   * The placement result. Shown but never editable: it is earned by taking the
   * level check, not declared.
   */
  placedLevel?: PlacedLevel | null;
};

export function DashboardProfileForm({
  showGooglePrefillHint = false,
  initialName,
  initialShortBio,
  avatarUrl,
  postSaveRedirect,
  presentation,
  initialLearningGoals = [],
  initialLearningGoalsNote = null,
  placedLevel = null,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const tGoals = useTranslations("onboarding");
  const router = useRouter();

  const goalLabel = (id: string) =>
    tGoals(LEARNING_GOALS.find((goal) => goal.id === id)!.labelKey);
  const levelLabelKey: Record<string, string> = {
    UNSET: "levelUnset",
    BEGINNER: "levelBeginner",
    INTERMEDIATE: "levelIntermediate",
    ADVANCED: "levelAdvanced",
  };

  const [saved, setSaved] = useState({
    name: initialName ?? "",
    shortBio: (initialShortBio ?? "").slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
    learningGoals: normalizeLearningGoals(initialLearningGoals) as string[],
    learningGoalsNote: initialLearningGoalsNote ?? "",
  });
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<SaveState>("idle");

  const isEmpty = !saved.name && !saved.shortBio;

  async function onSubmit(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim() || undefined,
        shortBio:
          draft.shortBio.trim() === ""
            ? null
            : draft.shortBio.trim().slice(0, STUDENT_SHORT_BIO_MAX_CHARS),
        learningGoals: draft.learningGoals,
        learningGoalsNote: draft.learningGoalsNote.trim() || null,
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return false;
    }

    setSaved(draft);

    const qsRedirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("onboardingNext")
        : null;
    const redirectTarget = postSaveRedirect ?? qsRedirect;
    if (redirectTarget) {
      try {
        router.push(decodeURIComponent(redirectTarget) as "/onboarding/next");
      } catch {
        router.push(redirectTarget as "/onboarding/next");
      }
      return false;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    return true;
  }

  return (
    <ProfileSurface
      avatarUrl={avatarUrl}
      name={saved.name}
      avatarHelp={t("avatarHelp")}
      emptyHint={t("emptyStudentProfileHint")}
      isEmpty={isEmpty}
      startInEdit={Boolean(postSaveRedirect)}
      presentation={presentation}
      saveState={status}
      copy={{
        edit: t("editProfile"),
        cancel: t("cancelEdit"),
        save: t("save"),
        saving: t("saving"),
        saved: t("saved"),
        error: t("error"),
        notSet: t("notSet"),
      }}
      entries={[
        /*
          The three things a teacher reads before a lesson, in the order they
          matter: where the student is, what they are working towards, and what
          they said about themselves.
        */
        ...(placedLevel
          ? [
              {
                label: t("level"),
                value: t(levelLabelKey[placedLevel] ?? "levelUnset"),
                empty: placedLevel === "UNSET",
              },
            ]
          : []),
        {
          label: t("learningGoals"),
          value: [...saved.learningGoals.map(goalLabel), saved.learningGoalsNote]
            .filter(Boolean)
            .join(" · "),
          empty: saved.learningGoals.length === 0 && !saved.learningGoalsNote.trim(),
        },
        {
          label: t("shortBio"),
          // Markdown, so it reads the way a teacher will see it rather than as
          // raw source.
          value: <MarkdownClamp markdown={saved.shortBio} emptyLabel="" />,
          empty: !saved.shortBio.trim(),
        },
      ]}
      onSave={onSubmit}
      onStartEdit={() => {
        setDraft(saved);
        setStatus("idle");
      }}
      onCancelEdit={() => {
        setDraft(saved);
        setStatus("idle");
      }}
    >
      <Field label={t("displayName")} hint={showGooglePrefillHint ? t("prefillFromGoogle") : null}>
        {(control) => (
          <Input
            {...control}
            name="name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={100}
          />
        )}
      </Field>

      <Field label={t("learningGoals")}>
        {() => (
          <LearningGoalsPicker
            goals={draft.learningGoals}
            note={draft.learningGoalsNote}
            onChange={(next) =>
              setDraft({ ...draft, learningGoals: next.goals, learningGoalsNote: next.note })
            }
          />
        )}
      </Field>

      <MarkdownField
        label={t("shortBio")}
        hint={t("shortBioHelp")}
        value={draft.shortBio}
        maxChars={STUDENT_SHORT_BIO_MAX_CHARS}
        placeholder={t("shortBioPlaceholder")}
        onChange={(md) => setDraft((d) => ({ ...d, shortBio: md }))}
      />
    </ProfileSurface>
  );
}
