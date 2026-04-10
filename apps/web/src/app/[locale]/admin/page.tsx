import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CalendarTokenForm } from "@/components/calendar-token-form";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const session = await auth();
  if (!session?.user?.id) return null;

  const teacher = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
  });

  const bookingFilter =
    session.user.role === "ADMIN"
      ? {}
      : teacher
        ? { teacherId: teacher.id }
        : { id: "___no-bookings___" };

  const bookings = await prisma.booking.findMany({
    where: bookingFilter,
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

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
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

      {session.user.role === "ADMIN" && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">{t("students")}</h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
            {students.map((s) => (
              <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-foreground">{s.name ?? s.email}</span>
                <span className="text-muted">
                  {s.studentProfile?.placedLevel ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">
          Google Calendar (Meet)
        </h2>
        <p className="mt-1 text-sm text-muted">
          OAuth refresh token with Calendar scope — store via API for automated Meet
          links.
        </p>
        <CalendarTokenForm />
      </section>
    </main>
  );
}
