import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { BuyCreditsButton } from "@/components/buy-credits-button";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const session = await auth();
  if (!session?.user?.id) return null;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const bookings = await prisma.booking.findMany({
    where: { studentId: session.user.id },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
    },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.endsAt >= now);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-slate-600">
        {t("credits")}:{" "}
        <span className="font-semibold text-slate-900">
          {profile?.lessonCredits ?? 0}
        </span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/book"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {tCommon("bookLesson")}
        </Link>
        <BuyCreditsButton />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">{t("upcoming")}</h2>
        <ul className="mt-4 space-y-4">
          {upcoming.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-slate-500">
              {t("noBookings")}
            </li>
          ) : (
            upcoming.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
                    </p>
                    <p className="text-sm text-slate-500">
                      {b.startsAt.toLocaleString()} — {b.endsAt.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("teacher")}: {b.teacher.user.name ?? b.teacher.user.email}
                    </p>
                  </div>
                  {b.meetUrl && (
                    <a
                      href={b.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-sky-600 hover:text-sky-800 sm:mt-0"
                    >
                      {t("meetLink")}
                    </a>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
