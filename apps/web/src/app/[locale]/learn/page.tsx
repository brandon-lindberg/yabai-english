import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";

export default async function LearnPage() {
  const t = await getTranslations("learn");
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: {
          skills: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("placeholder")}</p>
      <section className="mt-8 space-y-6">
        {courses.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-foreground">
              {c.titleJa} / {c.titleEn}
            </h2>
            <p className="mt-1 text-sm text-muted">{c.level}</p>
            <ul className="mt-4 space-y-2">
              {c.units.flatMap((u) =>
                u.skills.flatMap((s) =>
                  s.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/lesson/${lesson.id}`}
                        className="text-link hover:opacity-90"
                      >
                        {lesson.titleJa} — {lesson.titleEn}
                      </Link>
                    </li>
                  )),
                ),
              )}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
