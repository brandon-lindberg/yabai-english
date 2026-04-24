"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type SchoolClass = {
  id: string;
  startsAt: string;
  endsAt: string;
  meetUrl?: string | null;
  scheduleSlot?: {
    lessonLevel: string;
    lessonType: string;
    labelJa?: string | null;
    labelEn?: string | null;
    capacity: number;
  };
  teacherMembership?: {
    user: { id: string; name: string | null; image: string | null };
  };
  attendees: { id: string }[];
};

type Slot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  lessonLevel: string;
  lessonType: string;
  labelJa?: string | null;
  labelEn?: string | null;
  capacity: number;
  assignedTeacher?: { user: { name: string | null } } | null;
  _count?: { enrollments: number };
};

type Props = {
  orgId: string;
  schoolId: string;
  canSelfEnroll: boolean;
  studentMembershipId: string | null;
};

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function SchoolClassesView({
  orgId,
  schoolId,
  canSelfEnroll,
  studentMembershipId,
}: Props) {
  const t = useTranslations("org.school.classesPage");
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}/classes`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes ?? []));
  }, [orgId, schoolId]);

  useEffect(() => {
    if (!canSelfEnroll) return;
    fetch(`/api/org/${orgId}/schools/${schoolId}/schedule`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        setEnrolledIds(new Set<string>(d.viewerEnrolledSlotIds ?? []));
      });
  }, [orgId, schoolId, canSelfEnroll]);

  async function handleEnroll(slotId: string) {
    if (!studentMembershipId) return;
    setEnrollingId(slotId);
    setEnrollError("");
    const res = await fetch(
      `/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}/enroll`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentMembershipId }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setEnrollError(data?.error ?? t("enrollError"));
      setEnrollingId(null);
      return;
    }
    setSlots((prev) =>
      prev
        ? prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  _count: { enrollments: (s._count?.enrollments ?? 0) + 1 },
                }
              : s,
          )
        : prev,
    );
    setEnrolledIds((prev) => new Set(prev).add(slotId));
    setEnrollingId(null);
  }

  const enrolledSlotIds = enrolledIds;

  return (
    <div className="space-y-8">
      {canSelfEnroll && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t("browseTitle")}
          </h2>
          {enrollError && (
            <p className="mb-3 text-sm text-[var(--app-danger)]">{enrollError}</p>
          )}
          {slots === null ? (
            <p className="text-sm text-muted">{t("loading")}</p>
          ) : slots.length === 0 ? (
            <AppCard>
              <p className="text-sm text-muted">{t("noBrowseSlots")}</p>
            </AppCard>
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => {
                const enrolled = enrolledSlotIds.has(slot.id);
                const count = slot._count?.enrollments ?? 0;
                const full = count >= slot.capacity;
                return (
                  <AppCard key={slot.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {slot.labelEn ??
                            `${slot.lessonLevel} · ${slot.lessonType}`}
                        </p>
                        <p className="text-xs text-muted">
                          {t(`days.${slot.dayOfWeek}`)} ·{" "}
                          {fmtMin(slot.startMin)}–{fmtMin(slot.endMin)}
                        </p>
                        {slot.assignedTeacher?.user?.name && (
                          <p className="text-xs text-muted">
                            {t("teacher", { name: slot.assignedTeacher.user.name })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                          {count}/{slot.capacity}
                        </span>
                        {enrolled ? (
                          <span className="rounded-full bg-[var(--app-hover)] px-3 py-0.5 text-xs font-semibold text-foreground">
                            {t("enrolled")}
                          </span>
                        ) : (
                          <button
                            disabled={full || enrollingId === slot.id}
                            onClick={() => handleEnroll(slot.id)}
                            className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {full
                              ? t("full")
                              : enrollingId === slot.id
                                ? t("enrolling")
                                : t("join")}
                          </button>
                        )}
                      </div>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {t("upcomingTitle")}
        </h2>
        {classes === null ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : classes.length === 0 ? (
          <AppCard>
            <p className="text-sm text-muted">{t("none")}</p>
          </AppCard>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => {
              const label =
                c.scheduleSlot?.labelEn ??
                `${c.scheduleSlot?.lessonLevel ?? ""} ${c.scheduleSlot?.lessonType ?? ""}`.trim();
              const capacity = c.scheduleSlot?.capacity ?? 1;
              const enrolled = c.attendees.length;
              return (
                <AppCard key={c.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted">
                        {new Date(c.startsAt).toLocaleString()} –{" "}
                        {new Date(c.endsAt).toLocaleTimeString()}
                      </p>
                      {c.teacherMembership?.user?.name && (
                        <p className="text-xs text-muted">
                          {t("teacher", { name: c.teacherMembership.user.name })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.meetUrl && (
                        <a
                          href={c.meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          {t("join")}
                        </a>
                      )}
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                        {enrolled}/{capacity}
                      </span>
                    </div>
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
