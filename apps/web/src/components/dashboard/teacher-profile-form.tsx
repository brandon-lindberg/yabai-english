"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

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
  const router = useRouter();
  const [teacherProfileId, setTeacherProfileId] = useState(initialTeacherProfileId);
  const [marketplaceHidden, setMarketplaceHidden] = useState(initialMarketplaceHidden);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialCountryOfOrigin ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? "");
  const [instructionLanguages, setInstructionLanguages] = useState(initialInstructionLanguages.join(", "));
  const [specialties, setSpecialties] = useState(initialSpecialties.join(", "));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const qsRedirect = new URLSearchParams(window.location.search).get("onboardingNext");
    console.info("[onboarding][teacher-profile-mount]", {
      currentUrl: window.location.href,
      postSaveRedirect,
      qsRedirect,
    });
  }, [postSaveRedirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() === "" ? null : bio.trim(),
        countryOfOrigin: countryOfOrigin.trim() === "" ? null : countryOfOrigin.trim(),
        credentials: credentials.trim() === "" ? null : credentials.trim(),
        instructionLanguages: instructionLanguages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specialties: specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        marketplaceHidden,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    const body = (await response.json().catch(() => null)) as { teacherProfileId?: string } | null;
    if (body?.teacherProfileId) {
      setTeacherProfileId(body.teacherProfileId);
    }

    const qsRedirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("onboardingNext")
        : null;
    const redirectTarget = postSaveRedirect ?? qsRedirect;
    if (typeof window !== "undefined") {
      console.info("[onboarding][teacher-profile-save]", {
        currentUrl: window.location.href,
        postSaveRedirect,
        qsRedirect,
        redirectTarget,
      });
    }
    if (redirectTarget) {
      router.push(decodeURIComponent(redirectTarget) as "/onboarding/teacher");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  const displayForInitial = displayName.trim() || "—";
  const avatarInitial = displayForInitial.slice(0, 2).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-foreground/5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {avatarInitial}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{t("avatarHelp")}</p>
      </div>

      {teacherProfileId ? (
        <p className="text-sm text-muted">
          <Link
            href={`/book/teachers/${teacherProfileId}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {marketplaceHidden ? t("teacherPreviewWhenHidden") : t("teacherPreviewPublic")}
          </Link>
        </p>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface/40 p-4 text-sm">
        <input
          type="checkbox"
          checked={marketplaceHidden}
          onChange={(e) => setMarketplaceHidden(e.target.checked)}
          className="mt-1 size-4 rounded border-border"
        />
        <span>
          <span className="font-medium text-foreground">{t("teacherMarketplaceHiddenLabel")}</span>
          <span className="mt-1 block text-muted">{t("teacherMarketplaceHiddenHelp")}</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">{t("displayName")}</span>
          {showGooglePrefillHint ? (
            <span className="block text-xs font-normal text-muted">{t("prefillFromGoogle")}</span>
          ) : null}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">{t("teacherCountryOfOrigin")}</span>
          <input
            value={countryOfOrigin}
            onChange={(e) => setCountryOfOrigin(e.target.value)}
            maxLength={80}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">{t("teacherBio")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">{t("teacherCredentials")}</span>
        <textarea
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">{t("teacherInstructionLanguages")}</span>
          <input
            value={instructionLanguages}
            onChange={(e) => setInstructionLanguages(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">{t("teacherSpecialties")}</span>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
        {status === "saved" ? <span className="text-sm text-green-600 dark:text-green-400">{t("saved")}</span> : null}
        {status === "error" ? <span className="text-sm text-destructive">{t("error")}</span> : null}
      </div>
    </form>
  );
}
