"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

const INDIVIDUAL_DURATIONS = [30, 40, 60, 90] as const;

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

type LessonOfferingInput = {
  id?: string;
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  groupSize: number | null;
  classTypeId: string | null;
};

type IndividualOfferRow = {
  clientId: string;
  durationMin: number;
  classTypeId: string;
  rateYenInput: string;
};

type GroupOfferRow = {
  clientId: string;
  durationMin: number;
  groupSize: number;
  classTypeId: string;
  rateYenInput: string;
};

type Props = {
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
  postSaveRedirect?: string | null;
  initialLessonOfferings: Array<{
    id: string;
    durationMin: number;
    rateYen: number;
    isGroup: boolean;
    groupSize: number | null;
    classTypeId?: string | null;
    classType?: TaxonomyOption | null;
  }>;
  classTypes: TaxonomyOption[];
};

function pickLabel(opt: TaxonomyOption, locale: string): string {
  return locale.toLowerCase().startsWith("ja")
    ? (opt.labelJa ?? opt.labelEn)
    : opt.labelEn;
}

function makeRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  postSaveRedirect,
  initialLessonOfferings,
  classTypes,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const locale = useLocale();
  const router = useRouter();
  const defaultClassTypeId = classTypes[0]?.id ?? "";
  const [teacherProfileId, setTeacherProfileId] = useState(initialTeacherProfileId);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialCountryOfOrigin ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? "");
  const [instructionLanguages, setInstructionLanguages] = useState(initialInstructionLanguages.join(", "));
  const [specialties, setSpecialties] = useState(initialSpecialties.join(", "));
  const [individualOffers, setIndividualOffers] = useState<IndividualOfferRow[]>(() => {
    const rows = initialLessonOfferings
      .filter((o) => !o.isGroup)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        rateYenInput: String(o.rateYen),
      }));
    if (rows.length > 0) return rows;
    if (initialRateYen != null) {
      return [
        {
          clientId: makeRowId(),
          durationMin: 30,
          classTypeId: defaultClassTypeId,
          rateYenInput: String(initialRateYen),
        },
      ];
    }
    return [];
  });
  const [groupOffers, setGroupOffers] = useState<GroupOfferRow[]>(
    initialLessonOfferings
      .filter((o) => o.isGroup && o.groupSize)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        groupSize: o.groupSize ?? 2,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        rateYenInput: String(o.rateYen),
      })),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(initialOffersFreeTrial);
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
    const lessonOfferings: LessonOfferingInput[] = [];

    for (const row of individualOffers) {
      const rate = Number.parseInt(row.rateYenInput.trim(), 10);
      if (Number.isNaN(rate) || rate <= 0) {
        setStatus("error");
        return;
      }
      lessonOfferings.push({
        durationMin: row.durationMin,
        rateYen: rate,
        isGroup: false,
        groupSize: null,
        classTypeId: row.classTypeId || null,
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
        classTypeId: group.classTypeId || null,
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

      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherRatesByDurationTitle")}</h3>
          <button
            type="button"
            onClick={() =>
              setIndividualOffers((prev) => [
                ...prev,
                {
                  clientId: makeRowId(),
                  durationMin: 30,
                  classTypeId: defaultClassTypeId,
                  rateYenInput: "",
                },
              ])
            }
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherIndividualRatesAdd")}
          </button>
        </div>
        <p className="text-xs text-muted">{t("teacherRatesByDurationHelp")}</p>
        <p className="text-xs text-muted">{t("teacherLessonTypeForRateHelp")}</p>

        {individualOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherIndividualRatesEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {individualOffers.map((row, index) => (
              <div
                key={row.clientId}
                className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface/60 p-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  <span className="text-muted">{t("teacherLessonTypeForRate")}</span>
                  <select
                    value={row.classTypeId}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, classTypeId: e.target.value } : r,
                        ),
                      )
                    }
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                  >
                    {classTypes.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {pickLabel(opt, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  <span className="text-muted">{t("teacherDurationLabel")}</span>
                  <select
                    value={row.durationMin}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, durationMin: Number.parseInt(e.target.value, 10) }
                            : r,
                        ),
                      )
                    }
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                  >
                    {INDIVIDUAL_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  <span className="text-muted">{t("teacherRateYenLabel")}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={row.rateYenInput}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, rateYenInput: e.target.value.replace(/\D/g, "") }
                            : r,
                        ),
                      )
                    }
                    placeholder="3500"
                    className="w-36 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setIndividualOffers((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                >
                  {t("teacherIndividualRatesRemove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherGroupRatesTitle")}</h3>
          <button
            type="button"
            onClick={() =>
              setGroupOffers((prev) => [
                ...prev,
                {
                  clientId: makeRowId(),
                  durationMin: 60,
                  groupSize: 2,
                  classTypeId: defaultClassTypeId,
                  rateYenInput: "",
                },
              ])
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
              <div key={group.clientId} className="flex flex-wrap items-end gap-2">
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
                  value={group.classTypeId}
                  onChange={(e) =>
                    setGroupOffers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, classTypeId: e.target.value } : row,
                      ),
                    )
                  }
                  className="rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground"
                >
                  {classTypes.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {pickLabel(opt, locale)}
                    </option>
                  ))}
                </select>
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
