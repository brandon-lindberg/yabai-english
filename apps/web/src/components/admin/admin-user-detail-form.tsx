"use client";

import { TeachingLanguagesField } from "@/components/admin/teaching-languages-field";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { AccountStatus, PlacedLevel, Role } from "@/generated/prisma/browser";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AdminTeacherProfileDto } from "@/lib/admin-user-dto";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { LocalDateTime } from "@/components/local-datetime";
import { actionLinkClass } from "@/components/ui/inline-link";
import { MarkdownField } from "@/components/ui/markdown-field";
import {
  PLACEMENT_NOTE_MAX_CHARS,
  TEACHER_BIO_MAX_CHARS,
  TEACHER_CREDENTIALS_MAX_CHARS,
} from "@/lib/markdown/limits";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { AdminTeacherRateGrants } from "@/components/admin/admin-teacher-rate-grants";

const LOCALES = ["ja", "en"] as const;
const ROLES = [Role.STUDENT, Role.TEACHER, Role.SUPER_ADMIN] as const;
type AccessAction = "suspend" | "reinstate" | "hide" | "unhide" | "changeRole";
const PLACED_LEVELS = [
  PlacedLevel.UNSET,
  PlacedLevel.BEGINNER,
  PlacedLevel.INTERMEDIATE,
  PlacedLevel.ADVANCED,
] as const;

type StudentProfileDto = {
  id: string;
  timezone: string;
  shortBio: string | null;
  placedLevel: PlacedLevel;
  placedSubLevel: number | null;
  placementNeedsReview: boolean;
  placementReviewReason: string | null;
};

type UserDetailJson = {
  id: string;
  name: string | null;
  email: string | null;
  locale: string;
  role: Role;
  accountStatus: AccountStatus;
  studentProfile: StudentProfileDto | null;
  teacherProfile: AdminTeacherProfileDto | null;
  adminAccessEvents?: Array<{ id: number; actorId: string; actorName?: string; fromStatus: AccountStatus; toStatus: AccountStatus; reason: string; createdAt: string }>;
  followUp?: { upcomingLessons: number; unresolvedPayments: number } | null;
};

export function AdminUserDetailForm({ userId, backHref = "/admin/users" }: { userId: string; backHref?: string }) {
  const t = useTranslations("admin.userDetail");
  const tg = useTranslations("admin.grid");
  const tGrants = useTranslations("admin.teacherRateGrants");
  const viewerLocale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teacherProfileId, setTeacherProfileId] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [locale, setLocale] = useState("ja");
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(AccountStatus.ACTIVE);
  const [accessEvents, setAccessEvents] = useState<NonNullable<UserDetailJson["adminAccessEvents"]>>([]);
  const [followUp, setFollowUp] = useState<UserDetailJson["followUp"]>(null);
  const [accessAction, setAccessAction] = useState<AccessAction | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [targetRole, setTargetRole] = useState<Role>(Role.STUDENT);
  const [promotionLanguages, setPromotionLanguages] = useState<LearningLanguage[]>([]);
  const [identity, setIdentity] = useState<{ name: string | null; email: string | null }>({ name: null, email: null });

  const [stuTz, setStuTz] = useState("");
  const [stuBio, setStuBio] = useState("");
  const [placedLevel, setPlacedLevel] = useState<PlacedLevel>(PlacedLevel.UNSET);
  const [placedSub, setPlacedSub] = useState<string>("");
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewReason, setReviewReason] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [credentials, setCredentials] = useState("");
  const [rateYen, setRateYen] = useState("");
  const [offersTrial, setOffersTrial] = useState(true);
  const [specialties, setSpecialties] = useState("");
  const [teachingLanguages, setTeachingLanguages] = useState<LearningLanguage[]>([]);
  const [instrLangs, setInstrLangs] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = (await res.json()) as UserDetailJson & { error?: string };
      if (!res.ok) {
        setLoadError(true);
        setError(data.error ?? t("loadError"));
        return;
      }
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setLocale(data.locale);
      setRole(data.role);
      setAccountStatus(data.accountStatus);
      setAccessEvents(data.adminAccessEvents ?? []);
      setFollowUp(data.followUp);
      setIdentity({ name: data.name, email: data.email });
      if (data.studentProfile) {
        setStuTz(data.studentProfile.timezone);
        setStuBio(data.studentProfile.shortBio ?? "");
        setPlacedLevel(data.studentProfile.placedLevel);
        setPlacedSub(
          data.studentProfile.placedSubLevel != null ? String(data.studentProfile.placedSubLevel) : "",
        );
        setNeedsReview(data.studentProfile.placementNeedsReview);
        setReviewReason(data.studentProfile.placementReviewReason ?? "");
      }
      if (data.teacherProfile) {
        setTeacherProfileId(data.teacherProfile.id);
        setTeachingLanguages(data.teacherProfile.teachingLanguages ?? ["ENGLISH"]);
        setCalendarConnected(data.teacherProfile.calendarConnected);
        setDisplayName(data.teacherProfile.displayName ?? "");
        setBio(data.teacherProfile.bio ?? "");
        setCountry(data.teacherProfile.countryOfOrigin ?? "");
        setCredentials(data.teacherProfile.credentials ?? "");
        setRateYen(
          data.teacherProfile.rateYen != null ? String(data.teacherProfile.rateYen) : "",
        );
        setOffersTrial(data.teacherProfile.offersFreeTrial);
        setSpecialties(data.teacherProfile.specialties.join(", "));
        setInstrLangs(data.teacherProfile.instructionLanguages.join(", "));
      } else {
        setCalendarConnected(false);
      }
    } catch {
      setLoadError(true);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setStatusMsg(null);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim() || null,
        ...(accountStatus === AccountStatus.SUSPENDED ? {} : { email: email.trim() || null }),
        locale: locale.trim(),
      };
      if (role === Role.STUDENT) {
        body.studentProfile = {
          timezone: stuTz.trim() || undefined,
          shortBio: stuBio.trim() || null,
          placedLevel,
          placedSubLevel: placedSub.trim() ? Number(placedSub) : null,
          placementNeedsReview: needsReview,
          placementReviewReason: reviewReason.trim() || null,
        };
      }
      if (role === Role.TEACHER) {
        const langs = instrLangs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const rateNum = rateYen.trim() === "" ? null : Number(rateYen);
        body.teacherProfile = {
          teachingLanguages,
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || null,
          countryOfOrigin: country.trim() || null,
          credentials: credentials.trim() || null,
          rateYen: rateNum !== null && Number.isFinite(rateNum) ? rateNum : null,
          offersFreeTrial: offersTrial,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          instructionLanguages: langs.length > 0 ? langs : ["EN"],
        };
      }

      await writeUser(body);
      setStatusMsg(t("saved"));
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function writeUser(body: Record<string, unknown>, access = false) {
    const res = await fetch(`/api/admin/users/${userId}${access ? "/access" : ""}`, {
      method: access ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return;
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(access
      ? t(data?.error === "ACCOUNT_ACCESS_CHANGED" ? "accessStale" : "saveError")
      : data?.error ?? t("saveError"));
  }

  function openAccess(action: AccessAction) {
    setAccessError(null);
    setReason("");
    setTargetRole(role);
    setPromotionLanguages(teachingLanguages);
    setAccessAction(action);
  }

  async function confirmAccess() {
    if (!accessAction) return;
    setSaving(true);
    setAccessError(null);
    try {
      if (accessAction === "suspend" || accessAction === "reinstate") {
        await writeUser({ action: accessAction, reason, expectedEventId: accessEvents[0]?.id ?? null }, true);
      } else if (accessAction === "changeRole") {
        await writeUser({ role: targetRole, ...(targetRole === Role.TEACHER ? { teacherProfile: { teachingLanguages: promotionLanguages } } : {}) });
      } else {
        await writeUser({ accountStatus: accessAction === "hide" ? AccountStatus.HIDDEN : AccountStatus.ACTIVE });
      }
      setAccessAction(null);
      setStatusMsg(t("saved"));
      await load();
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  /** `ConfirmDelete` owns the typed-confirmation guard; this only performs it. */
  async function remove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? t("saveError"));
        return;
      }
      router.push(backHref);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="space-y-10"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        data-testid="admin-user-detail-loading"
      >
        <section className="space-y-4 border-t border-border pt-6">
          <Skeleton height="6" width="1/3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-lg border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <Skeleton height="6" width="1/3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-lg border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
        </section>
        <div className="flex flex-wrap gap-2">
          <Skeleton height="10" width="1/4" rounded="full" className="!w-24" />
          <Skeleton height="10" width="1/4" rounded="full" className="!w-20" />
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <p role="alert">
        <Status tone="error">{error}</Status>
      </p>
    );
  }

  const suspended = accountStatus === AccountStatus.SUSPENDED;
  const needsReason = accessAction === "suspend" || accessAction === "reinstate";
  const hiddenAction = accountStatus === AccountStatus.ACTIVE ? "hide" : "unhide";

  return (
    <div className="space-y-10">
      <div className="break-words">
        <PageHeader title={identity.name ?? identity.email ?? t("title")} description={identity.name ? identity.email : undefined} />
      </div>
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      {statusMsg ? (
        <p role="status">
          <Status tone="settled">{statusMsg}</Status>
        </p>
      ) : null}

      <Section title={t("accessTitle")} ruled={false} actions={<Status tone={suspended ? "error" : accountStatus === "ACTIVE" ? "settled" : "open"}>{tg(`accessStatus.${accountStatus}`)}</Status>}>
        <p className="text-sm text-muted">{tg(`roles.${role}`)}</p>
        {followUp && (
          <div className="my-4 space-y-2 border-y border-border py-3">
            <p className="text-sm font-semibold">{t("followUp")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link className={actionLinkClass} href={`/admin/lessons?person=${encodeURIComponent(userId)}`}>{t("upcoming", { count: followUp.upcomingLessons })}</Link>
              <Link className={actionLinkClass} href={`/admin/payments?person=${encodeURIComponent(userId)}`}>{t("payments", { count: followUp.unresolvedPayments })}</Link>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {role !== Role.SUPER_ADMIN && <Button variant="secondary" disabled={saving} onClick={() => openAccess(suspended ? "reinstate" : "suspend")}>{t(suspended ? "reinstate" : "suspend")}</Button>}
          {!suspended && <>
            <Button variant="ghost" disabled={saving} onClick={() => openAccess("changeRole")}>{t("changeRole")}</Button>
            <Button variant="ghost" disabled={saving} onClick={() => openAccess(hiddenAction)}>{t(hiddenAction)}</Button>
            <ConfirmDelete
              triggerLabel={t("delete")}
              prompt={t("deleteConfirm")}
              expected={identity.email ?? ""}
              confirmLabel={t("delete")}
              cancelLabel={t("cancel")}
              busy={saving}
              busyLabel={t("saving")}
              onConfirm={() => void remove()}
            />
          </>}
        </div>
        {accessEvents.length > 0 && (
          <details className="mt-4 border-t border-border pt-3 text-sm">
            <summary className="cursor-pointer font-medium">{t("accessHistory")}</summary>
            <ol className="mt-2 divide-y divide-border">
              {accessEvents.map((event) => (
                <li key={event.id} className="space-y-1 break-words py-2">
                  <p className="font-medium">{tg(`accessStatus.${event.fromStatus}`)} → {tg(`accessStatus.${event.toStatus}`)}</p>
                  <p>{event.reason}</p>
                  <p className="text-muted"><LocalDateTime iso={event.createdAt} locale={viewerLocale} /> · {event.actorName ?? event.actorId}</p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </Section>

      {accessAction && (
        <Modal open onClose={() => { if (!saving) setAccessAction(null); }} title={t(accessAction)}
          description={t(`${accessAction}Effect`)} dismissOnBackdrop={false}
          actions={<>
            <Button variant="secondary" disabled={saving} onClick={() => setAccessAction(null)}>{t("cancel")}</Button>
            <Button loading={saving} disabled={(needsReason && !reason.trim()) ||
              (accessAction === "changeRole" && (targetRole === role || (targetRole === Role.TEACHER && !promotionLanguages.length)))}
              onClick={() => void confirmAccess()}>{t(accessAction)}</Button>
          </>}>
          <p className="break-words text-sm font-medium">{[identity.name, identity.email].filter(Boolean).join(" · ") || userId} · {tg(`roles.${role}`)}</p>
          {needsReason && (
            <Field label={t("privateReason")}>
              {(field) => <Textarea {...field} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />}
            </Field>
          )}
          {accessAction === "changeRole" && (
            <>
              <Field label={t("role")}>
                {(field) => <Select {...field} value={targetRole} onChange={(e) => setTargetRole(e.target.value as Role)}>
                  {ROLES.map((item) => <option key={item} value={item}>{tg(`roles.${item}`)}</option>)}
                </Select>}
              </Field>
              {targetRole === Role.TEACHER && <TeachingLanguagesField value={promotionLanguages} onChange={setPromotionLanguages} />}
            </>
          )}
          {accessError && <p role="alert" className="text-sm text-destructive">{accessError}</p>}
        </Modal>
      )}

      <Section title={t("sectionUser")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")}>
            {(field) => (
              <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
          <Field label={t("email")}>
            {(field) => (
              <Input
                {...field}
                type="email"
                disabled={suspended}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("locale")}>
            {(field) => (
              <Select
                {...field}
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Section>

      {role === Role.STUDENT ? (
        <Section title={t("sectionStudent")}>
          <div className="space-y-4">
            <Field label={t("timezone")}>
              {(field) => (
                <Input {...field} value={stuTz} onChange={(e) => setStuTz(e.target.value)} />
              )}
            </Field>
            <MarkdownField
              label={t("shortBio")}
              value={stuBio}
              maxChars={STUDENT_SHORT_BIO_MAX_CHARS}
              onChange={setStuBio}
            />
            <Field label={t("placedLevel")}>
              {(field) => (
                <Select
                  {...field}
                  value={placedLevel}
                  onChange={(e) => setPlacedLevel(e.target.value as PlacedLevel)}
                >
                  {PLACED_LEVELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("placedSubLevel")}>
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={placedSub}
                  onChange={(e) => setPlacedSub(e.target.value)}
                />
              )}
            </Field>
            <CheckRow checked={needsReview} onChange={setNeedsReview}>
              {t("placementNeedsReview")}
            </CheckRow>
            <MarkdownField
              label={t("placementReviewReason")}
              value={reviewReason}
              maxChars={PLACEMENT_NOTE_MAX_CHARS}
              onChange={setReviewReason}
            />
          </div>
        </Section>
      ) : null}

      {role === Role.TEACHER ? (
        <Section title={t("sectionTeacher")}>
          <div className="space-y-4">
            <TeachingLanguagesField value={teachingLanguages} onChange={setTeachingLanguages} />
            <Field label={t("displayName")}>
              {(field) => (
                <Input
                  {...field}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              )}
            </Field>
            <MarkdownField
              label={t("bio")}
              value={bio}
              maxChars={TEACHER_BIO_MAX_CHARS}
              onChange={setBio}
            />
            <Field label={t("countryOfOrigin")}>
              {(field) => (
                <Input
                  {...field}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              )}
            </Field>
            <MarkdownField
              label={t("credentials")}
              value={credentials}
              maxChars={TEACHER_CREDENTIALS_MAX_CHARS}
              onChange={setCredentials}
            />
            <Field label={t("rateYen")}>
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={rateYen}
                  onChange={(e) => setRateYen(e.target.value)}
                />
              )}
            </Field>
            <CheckRow checked={offersTrial} onChange={setOffersTrial}>
              {t("offersFreeTrial")}
            </CheckRow>
            <Field label={t("specialties")}>
              {(field) => (
                <Input
                  {...field}
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
              )}
            </Field>
            <Field label={t("instructionLanguages")}>
              {(field) => (
                <Input
                  {...field}
                  value={instrLangs}
                  onChange={(e) => setInstrLangs(e.target.value)}
                />
              )}
            </Field>
            <p className="text-sm text-muted">
              {t("calendarConnected")}: {calendarConnected ? tg("yes") : tg("no")}
            </p>
          </div>
        </Section>
      ) : null}

      <div className="flex flex-wrap items-start gap-3 border-t border-border pt-6">
        <Button loading={saving} disabled={role === Role.TEACHER && teachingLanguages.length === 0} onClick={() => void save()}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Its own section, and its own endpoint: granting a below-minimum class
          is a concession recorded against an admin, not a profile field. */}
      {role === Role.TEACHER && teacherProfileId ? (
        <Section title={tGrants("title")}>
          <AdminTeacherRateGrants teacherProfileId={teacherProfileId} />
        </Section>
      ) : null}

    </div>
  );
}
