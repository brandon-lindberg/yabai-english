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
    user: { id: string; name: string | null; image: string | null } | null;
  };
  attendees: { id: string }[];
};

type Props = {
  orgId: string;
  schoolId: string;
};

export function SchoolClassesView({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.classesPage");
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgId}/schools/${schoolId}/classes`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes ?? []));
  }, [orgId, schoolId]);

  return (
    <div className="space-y-8">
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
