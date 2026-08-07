"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CheckRow } from "@/components/ui/check-row";
import type { SaveState } from "@/components/ui/form-status";
import { Status } from "@/components/ui/status";
import { ProfileSurface } from "@/components/dashboard/profile-surface";
import { actionLinkClass } from "@/components/ui/inline-link";

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
  postSaveRedirect?: string | null;
};

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
  postSaveRedirect,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  // Reading a profile and filling one in want different labels: the form says
  // "Specialties (comma separated)", the profile just says "Specialties".
  const tb = useTranslations("booking");
  const router = useRouter();

  const [teacherProfileId, setTeacherProfileId] = useState(initialTeacherProfileId);
  const [saved, setSaved] = useState({
    marketplaceHidden: initialMarketplaceHidden,
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
        marketplaceHidden: draft.marketplaceHidden,
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

  const publicLink = teacherProfileId ? (
    <p>
      <Link
        href={`/book/teachers/${teacherProfileId}`}
        className={`${actionLinkClass} text-sm`}
      >
        {saved.marketplaceHidden ? t("teacherPreviewWhenHidden") : t("teacherPreviewPublic")}
      </Link>
    </p>
  ) : null;

  const languages = saved.instructionLanguages.trim();
  const subtitle = [saved.countryOfOrigin.trim(), languages].filter(Boolean).join(" \u00b7 ");

  return (
    <ProfileSurface
      avatarUrl={avatarUrl}
      name={saved.displayName}
      subtitle={subtitle || null}
      headerStatus={
        <Status tone={saved.marketplaceHidden ? "spent" : "settled"}>
          {saved.marketplaceHidden ? t("profileHidden") : t("profileVisible")}
        </Status>
      }
      avatarHelp={t("avatarHelp")}
      emptyHint={t("emptyProfileHint")}
      isEmpty={isEmpty}
      startInEdit={Boolean(postSaveRedirect)}
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
          value: saved.credentials,
          empty: !saved.credentials.trim(),
        },
        { label: t("teacherBio"), value: saved.bio, empty: !saved.bio.trim() },
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
      <CheckRow
        checked={draft.marketplaceHidden}
        onChange={(next) => set("marketplaceHidden", next)}
        className="border-y border-border py-4"
        description={t("teacherMarketplaceHiddenHelp")}
      >
        <span className="font-medium text-foreground">{t("teacherMarketplaceHiddenLabel")}</span>
      </CheckRow>

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

      <Field label={t("teacherBio")}>
        {(control) => (
          <Textarea
            {...control}
            rows={5}
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={2000}
          />
        )}
      </Field>

      <Field label={t("teacherCredentials")}>
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            value={draft.credentials}
            onChange={(e) => set("credentials", e.target.value)}
            maxLength={2000}
          />
        )}
      </Field>

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
