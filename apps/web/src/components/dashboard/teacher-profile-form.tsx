"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

const INDIVIDUAL_DURATIONS = [30, 40, 60, 90] as const;

type LessonOfferingInput = {
  id?: string;
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  groupSize: number | null;
};

type Props = {
  /** When display name was filled from Google user name because profile was empty */
  showGooglePrefillHint?: boolean;
  initialTeacherProfileId: string | null;
  initialDisplayName: string | null;
  initialBio: string | null;
  initialCountryOfOrigin: string | null;
  initialCredentials: string | null;
  initialInstructionLanguages: string[];
  initialSpecialties: string[];
  initialRateYen: number | null;
  initialOffersFreeTrial: boolean;
  initialLessonOfferings: Array<{
    id: string;
    durationMin: number;
    rateYen: number;
    isGroup: boolean;
    groupSize: number | null;
  }>;
};

export function TeacherProfileForm({
  showGooglePrefillHint = false,
  initialTeacherProfileId,
  initialDisplayName,
  initialBio,
  initialCountryOfOrigin,
  initialCredentials,
  initialInstructionLanguages,
  initialSpecialties,
  initialRateYen,
  initialOffersFreeTrial,
  initialLessonOfferings,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const [teacherProfileId, setTeacherProfileId] = useState(initialTeacherProfileId);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialCountryOfOrigin ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? "");
  const [instructionLanguages, setInstructionLanguages] = useState(initialInstructionLanguages.join(", "));
  const [specialties, setSpecialties] = useState(initialSpecialties.join(", "));
  const [individualRates, setIndividualRates] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {};
    for (const duration of INDIVIDUAL_DURATIONS) {
      const row = initialLessonOfferings.find((o) => !o.isGroup && o.durationMin === duration);
      next[duration] = row ? String(row.rateYen) : "";
    }
    if (Object.values(next).every((v) => v === "") && initialRateYen != null) {
      next[30] = String(initialRateYen);
    }
    return next;
  });
  const [individualEnabled, setIndividualEnabled] = useState<Record<number, boolean>>(() => {
    const next: Record<number, boolean> = {};
    for (const duration of INDIVIDUAL_DURATIONS) {
      next[duration] = initialLessonOfferings.some(
        (o) => !o.isGroup && o.durationMin === duration,
      );
    }
    if (!Object.values(next).some(Boolean) && initialRateYen != null) {
      next[30] = true;
    }
    return next;
  });
  const [groupOffers, setGroupOffers] = useState<Array<{
    durationMin: number;
    groupSize: number;
    rateYenInput: string;
  }>>(
    initialLessonOfferings
      .filter((o) => o.isGroup && o.groupSize)
      .map((o) => ({
        durationMin: o.durationMin,
        groupSize: o.groupSize ?? 2,
        rateYenInput: String(o.rateYen),
      })),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(initialOffersFreeTrial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const lessonOfferings: LessonOfferingInput[] = [];
    for (const duration of INDIVIDUAL_DURATIONS) {
      if (!individualEnabled[duration]) continue;
      const rate = Number.parseInt((individualRates[duration] ?? "").trim(), 10);
      if (Number.isNaN(rate) || rate <= 0) {
        setStatus("error");
        return;
      }
      lessonOfferings.push({
        durationMin: duration,
        rateYen: rate,
        isGroup: false,
        groupSize: null,
      });
    }
    for (const group of groupOffers) {
      const rate = Number.parseInt(group.rateYenInput.trim(), 10);
      if (Number.isNaN(rate) || rate <= 0 || group.groupSize < 2) {
        setStatus("error");
        return;
      }
      lessonOfferings.push({
        durationMin: group.durationMin,
        rateYen: rate,
        isGroup: true,
        groupSize: group.groupSize,
      });
    }
    const fallbackRate = lessonOfferings.find((o) => !o.isGroup)?.rateYen ?? null;

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
        rateYen: fallbackRate,
        offersFreeTrial,
        lessonOfferings,
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

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {teacherProfileId ? (
        <p>
          <Link
            href={`/book/teachers/${teacherProfileId}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("teacherPreviewPublic")}
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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

      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">{t("teacherRatesByDurationTitle")}</h3>
        <p className="text-xs text-muted">{t("teacherRatesByDurationHelp")}</p>
        <div className="space-y-2">
          {INDIVIDUAL_DURATIONS.map((duration) => (
            <div key={duration} className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={individualEnabled[duration]}
                  onChange={(e) =>
                    setIndividualEnabled((prev) => ({ ...prev, [duration]: e.target.checked }))
                  }
                />
                <span>{duration} min</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={!individualEnabled[duration]}
                value={individualRates[duration] ?? ""}
                onChange={(e) =>
                  setIndividualRates((prev) => ({
                    ...prev,
                    [duration]: e.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder="3500"
                className="w-36 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherGroupRatesTitle")}</h3>
          <button
            type="button"
            onClick={() =>
              setGroupOffers((prev) => [...prev, { durationMin: 60, groupSize: 2, rateYenInput: "" }])
            }
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherGroupRatesAdd")}
          </button>
        </div>
        <p className="text-xs text-muted">{t("teacherGroupRatesHelp")}</p>
        {groupOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherGroupRatesEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {groupOffers.map((group, index) => (
              <div key={`${index}-${group.durationMin}-${group.groupSize}`} className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={2}
                  value={group.groupSize}
                  onChange={(e) =>
                    setGroupOffers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, groupSize: Number.parseInt(e.target.value || "2", 10) } : row,
                      ),
                    )
                  }
                  className="w-20 rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground"
                />
                <select
                  value={group.durationMin}
                  onChange={(e) =>
                    setGroupOffers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, durationMin: Number.parseInt(e.target.value, 10) } : row,
                      ),
                    )
                  }
                  className="rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground"
                >
                  {INDIVIDUAL_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={group.rateYenInput}
                  onChange={(e) =>
                    setGroupOffers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, rateYenInput: e.target.value.replace(/\D/g, "") } : row,
                      ),
                    )
                  }
                  placeholder="8000"
                  className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setGroupOffers((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                >
                  {t("teacherGroupRatesRemove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <label className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={offersFreeTrial}
          onChange={(e) => setOffersFreeTrial(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-foreground">{t("teacherOffersFreeTrialLabel")}</span>
          <span className="mt-0.5 block text-xs text-muted">{t("teacherOffersFreeTrialHelp")}</span>
        </span>
      </label>

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
