import { getTranslations } from "next-intl/server";

export async function LandingHowItWorks() {
  const t = await getTranslations("landing");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t("howHeading")}</h2>
      <ol className="mt-6 grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="rounded-2xl border border-border bg-[var(--app-surface)] p-5 shadow-sm"
          >
            <span className="text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
