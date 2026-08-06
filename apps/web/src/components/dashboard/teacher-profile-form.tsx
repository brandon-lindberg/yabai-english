"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormStatus, type SaveState } from "@/components/ui/form-status";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Status } from "@/components/ui/status";

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

  /*
    Nothing written yet means nothing to look at, so a new teacher — and anyone
    arriving mid-onboarding — lands in edit mode rather than on an empty page.
  */
  const isEmpty = !saved.displayName && !saved.bio && !saved.credentials;
  const [editing, setEditing] = useState(isEmpty || Boolean(postSaveRedirect));

  const set = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  function startEditing() {
    setDraft(saved);
    setStatus("idle");
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(saved);
    setStatus("idle");
    setEditing(false);
  }

  async function onSubmit(e: React.FormEvent) {
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
      return;
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
      return;
    }

    setStatus("saved");
    setEditing(false);
    setTimeout(() => setStatus("idle"), 2000);
  }

  const publicLink = teacherProfileId ? (
    <Link
      href={`/book/teachers/${teacherProfileId}`}
      className="text-sm font-medium text-link underline-offset-4 hover:underline"
    >
      {saved.marketplaceHidden ? t("teacherPreviewWhenHidden") : t("teacherPreviewPublic")}
    </Link>
  ) : null;

  if (!editing) {
    const languages = saved.instructionLanguages.trim();
    const specialties = saved.specialties.trim();
    const subtitle = [saved.countryOfOrigin.trim(), languages].filter(Boolean).join(" · ");

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar src={avatarUrl} name={saved.displayName} size="lg" />
            <div className="min-w-0">
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-foreground">
                {saved.displayName || t("notSet")}
              </h2>
              {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
              <p className="mt-3">
                <Status tone={saved.marketplaceHidden ? "spent" : "settled"}>
                  {saved.marketplaceHidden ? t("profileHidden") : t("profileVisible")}
                </Status>
              </p>
            </div>
          </div>
          <Button onClick={startEditing}>{t("editProfile")}</Button>
        </div>

        <FormStatus
          state={status}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          errorLabel={t("error")}
        />

        <dl className="border-t border-border">
          <ProfileEntry label={t("teacherCredentials")} value={saved.credentials} empty={t("notSet")} />
          <ProfileEntry label={t("teacherBio")} value={saved.bio} empty={t("notSet")} />
          <ProfileEntry label={tb("teacherSpecialties")} value={specialties} empty={t("notSet")} />
        </dl>

        {publicLink ? <p>{publicLink}</p> : null}
        <p className="text-sm text-muted">{t("avatarHelp")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-4">
        <Avatar src={avatarUrl} name={draft.displayName} size="lg" />
        <p className="text-sm text-muted">{t("avatarHelp")}</p>
      </div>

      {isEmpty ? <InlineAlert>{t("emptyProfileHint")}</InlineAlert> : null}
      {publicLink ? <p>{publicLink}</p> : null}

      <label className="flex cursor-pointer items-start gap-3 border-y border-border py-4 text-sm">
        <input
          type="checkbox"
          checked={draft.marketplaceHidden}
          onChange={(e) => set("marketplaceHidden", e.target.checked)}
          className="mt-1 size-4 rounded border-border"
        />
        <span>
          <span className="font-medium text-foreground">{t("teacherMarketplaceHiddenLabel")}</span>
          <span className="mt-1 block text-muted">{t("teacherMarketplaceHiddenHelp")}</span>
        </span>
      </label>

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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={status === "saving"}>
          {t("save")}
        </Button>
        {isEmpty ? null : (
          <Button type="button" variant="secondary" onClick={cancelEditing}>
            {t("cancelEdit")}
          </Button>
        )}
        <FormStatus
          state={status}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          errorLabel={t("error")}
        />
      </div>
    </form>
  );
}

/** One field as students read it — or one muted line saying it is not filled in. */
function ProfileEntry({
  label,
  value,
  empty,
}: {
  label: string;
  value: string;
  empty: string;
}) {
  return (
    <div className="border-b border-border py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`mt-1 max-w-[68ch] whitespace-pre-line leading-relaxed ${
          value ? "text-foreground" : "text-muted"
        }`}
      >
        {value || empty}
      </dd>
    </div>
  );
}
