import { getTranslations } from "next-intl/server";

export async function LandingPillars() {
  const t = await getTranslations("landing");

  const pillars = [
    { title: t("pillarScheduleTitle"), body: t("pillarScheduleBody") },
    { title: t("pillarTeacherTitle"), body: t("pillarTeacherBody") },
    { title: t("pillarPracticeTitle"), body: t("pillarPracticeBody") },
  ];

  /*
    Deliberately looser than the ruled sequence above it: no boxes and no rules,
    just statements at scale with air around them. The dense passage earns this
    quiet one, and these are the claims worth reading slowly — continuity with
    one teacher is the whole product.
  */
  return (
    <section className="mt-24">
      <h2 className="text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
        {t("pillarsHeading")}
      </h2>

      <dl className="mt-10 flex flex-col gap-10 sm:gap-12">
        {pillars.map((p) => (
          <div key={p.title} className="max-w-[54ch]">
            <dt className="text-xl font-bold tracking-[-0.025em] text-foreground sm:text-2xl">
              {p.title}
            </dt>
            <dd className="mt-2 text-base leading-relaxed text-muted sm:text-lg">{p.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
