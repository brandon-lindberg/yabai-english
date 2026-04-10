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
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">{t("bookings")}</h2>
        <ul className="mt-4 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <p className="font-medium text-slate-900">
                {b.lessonProduct.nameEn} — {b.student.name ?? b.student.email}
              </p>
              <p className="text-slate-500">
                {b.startsAt.toLocaleString()} — {b.status}
              </p>
              {b.meetUrl && (
                <a
                  href={b.meetUrl}
                  className="mt-1 inline-block text-sky-600 hover:underline"
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
          <h2 className="text-lg font-semibold text-slate-800">{t("students")}</h2>
          <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {students.map((s) => (
              <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{s.name ?? s.email}</span>
                <span className="text-slate-500">
                  credits: {s.studentProfile?.lessonCredits ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">
          Google Calendar (Meet)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          OAuth refresh token with Calendar scope — store via API for automated Meet
          links.
        </p>
        <CalendarTokenForm />
      </section>
    </main>
  );
}
