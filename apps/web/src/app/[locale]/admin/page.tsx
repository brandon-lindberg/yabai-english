import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPlacementReviewForm } from "@/components/admin-placement-review-form";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;

  const bookings = await prisma.booking.findMany({
    where: {},
    orderBy: { startsAt: "desc" },
    take: 50,
    include: {
      student: true,
      lessonProduct: true,
      teacher: { include: { user: true } },
    },
  });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { studentProfile: true },
  });
  const reviewQueue = students.filter((s) => s.studentProfile?.placementNeedsReview);

  return (
    <main className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">{t("bookings")}</h2>
        <ul className="mt-4 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-border bg-surface p-4 text-sm shadow-sm"
            >
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameEn} — {b.student.name ?? b.student.email}
              </p>
              <p className="text-muted">
                {b.startsAt.toLocaleString()} — {b.status}
              </p>
              {b.meetUrl && (
                <a
                  href={b.meetUrl}
                  className="mt-1 inline-block text-link hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Meet
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">{t("reviewQueue")}</h2>
        {reviewQueue.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            {t("noReviewItems")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
            {reviewQueue.map((s) => (
              <li key={s.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{s.name ?? s.email}</p>
                    <p className="text-xs text-muted">
                      {t("reviewReason")}: {s.studentProfile?.placementReviewReason ?? "—"}
                    </p>
                  </div>
                  {s.studentProfile && (
                    <AdminPlacementReviewForm
                      studentId={s.id}
                      currentLevel={s.studentProfile.placedLevel}
                      defaultNeedsReview={true}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">{t("students")}</h2>
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-foreground">
                {s.name ?? s.email}
                {s.studentProfile && (
                  <AdminPlacementReviewForm
                    studentId={s.id}
                    currentLevel={s.studentProfile.placedLevel}
                    defaultNeedsReview={Boolean(s.studentProfile.placementNeedsReview)}
                  />
                )}
              </span>
              <span className="text-right text-muted">
                <span>{s.studentProfile?.placedLevel ?? "—"}</span>
                {s.studentProfile?.placementNeedsReview && (
                  <span className="ml-2 rounded-full border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--app-warning-text)]">
                    REVIEW
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
