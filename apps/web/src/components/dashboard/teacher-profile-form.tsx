"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Field, Input } from "@/components/ui/field";
import { MarkdownField } from "@/components/ui/markdown-field";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { TEACHER_BIO_MAX_CHARS, TEACHER_CREDENTIALS_MAX_CHARS } from "@/lib/markdown/limits";
import { CheckRow } from "@/components/ui/check-row";
import type { SaveState } from "@/components/ui/form-status";
import { Status } from "@/components/ui/status";
import { ProfileSurface } from "@/components/dashboard/profile-surface";
import { actionLinkClass } from "@/components/ui/inline-link";
import { CopyLinkField } from "@/components/ui/copy-link-field";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { teacherMarketplaceRosterOnly, teacherMarketplaceVisibilityKey } from "@/lib/teacher-marketplace-booking-access";

/**
 * A teacher's public profile — shown as a profile, edited on request.
 *
 * This screen used to open straight into a stack of empty inputs. A teacher's
 * first sight of "your profile" was two large blank textareas, and there was no
 * way to see the thing students actually read without leaving for the public
 * booking page. Worse, an empty field rendered as a full-height empty box, so
 * the less you had filled in, the more of the page it took up.
 *
 * It now reads as the profile, laid out the way the public page lays it out,
 * with an explicit Edit. Empty fields say they are empty in one muted line
 * instead of reserving five rows of nothing. A teacher with no profile yet
 * starts in edit mode, because there is nothing to look at.
 */

type Props = {
  showGooglePrefillHint?: boolean;
  /** OAuth / account image URL (same source as student profile) */
  avatarUrl: string | null;
  initialTeacherProfileId: string | null;
  initialDisplayName: string | null;
  initialBio: string | null;
  initialCountryOfOrigin: string | null;
  initialCredentials: string | null;
  initialInstructionLanguages: string[];
  initialSpecialties: string[];
  initialMarketplaceHidden?: boolean;
  initialJapaneseMarketplaceHidden?: boolean;
  teachingLanguages?: LearningLanguage[];
  activeLearningLanguage?: LearningLanguage;
  postSaveRedirect?: string | null;
  /** See ProfileSurface: `trigger` renders the button and its dialog only. */
  presentation?: "page" | "trigger";
};

function noopSubscribe() {
  return () => {};
}

export function TeacherProfileForm({
  showGooglePrefillHint = false,
  avatarUrl,
  initialTeacherProfileId,
  initialDisplayName,
  initialBio,
  initialCountryOfOrigin,
  initialCredentials,
  initialInstructionLanguages,
  initialSpecialties,
  initialMarketplaceHidden = false,
  initialJapaneseMarketplaceHidden = false,
  teachingLanguages = ["ENGLISH"],
  activeLearningLanguage = "ENGLISH",
  postSaveRedirect,
  presentation,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  // Reading a profile and filling one in want different labels: the form says
  // "Specialties (comma separated)", the profile just says "Specialties".
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const language = useTranslations("admin.teachingLanguages");
  const router = useRouter();

  const [teacherProfileId, setTeacherProfileId] = useState(initialTeacherProfileId);
  // The site's own address, read in the browser so the copied link always
  // points at the domain the teacher is on. Empty during server render.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const [saved, setSaved] = useState({
    marketplaceHidden: initialMarketplaceHidden,
    japaneseMarketplaceHidden: initialJapaneseMarketplaceHidden,
    displayName: initialDisplayName ?? "",
    bio: initialBio ?? "",
    countryOfOrigin: initialCountryOfOrigin ?? "",
    credentials: initialCredentials ?? "",
    instructionLanguages: initialInstructionLanguages.join(", "),
    specialties: initialSpecialties.join(", "),
  });
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<SaveState>("idle");

  const isEmpty = !saved.displayName && !saved.bio && !saved.credentials;
  const inMarketplace = teachingLanguages.includes(activeLearningLanguage);
  const rosterOnly = teacherMarketplaceRosterOnly(saved, activeLearningLanguage);

  const set = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: draft.displayName.trim() || undefined,
        bio: draft.bio.trim() === "" ? null : draft.bio.trim(),
        countryOfOrigin: draft.countryOfOrigin.trim() === "" ? null : draft.countryOfOrigin.trim(),
        credentials: draft.credentials.trim() === "" ? null : draft.credentials.trim(),
        instructionLanguages: draft.instructionLanguages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specialties: draft.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...(draft.marketplaceHidden !== saved.marketplaceHidden ? { marketplaceHidden: draft.marketplaceHidden } : {}),
        ...(draft.japaneseMarketplaceHidden !== saved.japaneseMarketplaceHidden ? { japaneseMarketplaceHidden: draft.japaneseMarketplaceHidden } : {}),
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return false;
    }

    const body = (await response.json().catch(() => null)) as { teacherProfileId?: string } | null;
    if (body?.teacherProfileId) setTeacherProfileId(body.teacherProfileId);

    setSaved(draft);

    const qsRedirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("onboardingNext")
        : null;
    const redirectTarget = postSaveRedirect ?? qsRedirect;
    if (redirectTarget) {
      router.push(decodeURIComponent(redirectTarget) as "/onboarding/teacher");
      return false;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    return true;
  }

  // Unprefixed by locale on purpose: the student lands in their own language,
  // not the teacher's.
  const bookingPath = teacherProfileId && inMarketplace ? `/book/teachers/${teacherProfileId}` : null;
  const publicLink = bookingPath ? (
    <div className="space-y-2">
      {/* A hidden teacher's page exists only to be passed on, so the sentence
          introduces the link to copy rather than being a link itself —
          following it would only bounce a teacher back to their dashboard. */}
      {rosterOnly ? (
        <p className="text-sm text-foreground">{t("teacherPreviewWhenHidden")}</p>
      ) : (
        <p>
          <Link href={bookingPath} className={`${actionLinkClass} text-sm`}>
            {t("teacherPreviewPublic")}
          </Link>
        </p>
      )}
      {origin ? (
        <CopyLinkField value={`${origin}${bookingPath}`} label={t("teacherBookingLinkLabel")} />
      ) : null}
    </div>
  ) : null;

  const languages = saved.instructionLanguages.trim();
  const subtitle = [saved.countryOfOrigin.trim(), languages].filter(Boolean).join(" \u00b7 ");

  return (
    <ProfileSurface
      avatarUrl={avatarUrl}
      name={saved.displayName}
      subtitle={subtitle || null}
      headerStatus={
        inMarketplace ? <Status tone={rosterOnly ? "spent" : "settled"}>
          {rosterOnly ? t("profileHidden") : t("profileVisible")}
        </Status> : null
      }
      avatarHelp={t("avatarHelp")}
      emptyHint={t("emptyProfileHint")}
      isEmpty={isEmpty}
      startInEdit={Boolean(postSaveRedirect)}
      presentation={presentation}
      saveState={status}
      footer={publicLink}
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
        {
          label: t("teacherCredentials"),
          value: <MarkdownClamp markdown={saved.credentials} emptyLabel="" />,
          empty: !saved.credentials.trim(),
        },
        {
          label: t("teacherBio"),
          value: <MarkdownClamp markdown={saved.bio} emptyLabel="" />,
          empty: !saved.bio.trim(),
        },
        {
          // Reading a profile and filling one in want different labels: the form
          // says "Specialties (comma separated)", the profile just says
          // "Specialties".
          label: tb("teacherSpecialties"),
          value: saved.specialties,
          empty: !saved.specialties.trim(),
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
      <fieldset className="border-y border-border py-4">
        <legend className="text-sm font-semibold">{t("teacherMarketplaceTitle")}</legend>
        <p className="mb-2 text-sm text-muted">{t("teacherMarketplaceHiddenHelp")}</p>
        {teachingLanguages.map((subject) => (
          <CheckRow key={subject} checked={teacherMarketplaceRosterOnly(draft, subject)}
            onChange={(next) => set(teacherMarketplaceVisibilityKey(subject), next)}>
            <span className="font-medium text-foreground">{t("teacherMarketplaceSubject", { language: language(subject) })}</span>
          </CheckRow>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("displayName")}
          hint={showGooglePrefillHint ? t("prefillFromGoogle") : null}
        >
          {(control) => (
            <Input
              {...control}
              value={draft.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              maxLength={100}
            />
          )}
        </Field>
        <Field label={t("teacherCountryOfOrigin")}>
          {(control) => (
            <Input
              {...control}
              value={draft.countryOfOrigin}
              onChange={(e) => set("countryOfOrigin", e.target.value)}
              maxLength={80}
            />
          )}
        </Field>
      </div>

      <MarkdownField
        label={t("teacherBio")}
        hint={tc("markdownFormattingHint")}
        value={draft.bio}
        maxChars={TEACHER_BIO_MAX_CHARS}
        onChange={(md) => set("bio", md)}
      />

      <MarkdownField
        label={t("teacherCredentials")}
        hint={tc("markdownFormattingHint")}
        value={draft.credentials}
        maxChars={TEACHER_CREDENTIALS_MAX_CHARS}
        onChange={(md) => set("credentials", md)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("teacherInstructionLanguages")}>
          {(control) => (
            <Input
              {...control}
              value={draft.instructionLanguages}
              onChange={(e) => set("instructionLanguages", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("teacherSpecialties")}>
          {(control) => (
            <Input
              {...control}
              value={draft.specialties}
              onChange={(e) => set("specialties", e.target.value)}
            />
          )}
        </Field>
      </div>
    </ProfileSurface>
  );
}
