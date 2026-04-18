import { getTranslations } from "next-intl/server";

export async function LandingPillars() {
  const t = await getTranslations("landing");

  const pillars = [
    { title: t("pillarScheduleTitle"), body: t("pillarScheduleBody") },
    { title: t("pillarTeacherTitle"), body: t("pillarTeacherBody") },
    { title: t("pillarPracticeTitle"), body: t("pillarPracticeBody") },
  ];

  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t("pillarsHeading")}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {pillars.map((p) => (
          <li
            key={p.title}
            className="rounded-2xl border border-border bg-[var(--app-elevated)] px-5 py-4 text-sm leading-relaxed text-muted"
          >
            <span className="font-semibold text-foreground">{p.title}</span>
            <span className="mt-2 block">{p.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
