import { getTranslations } from "next-intl/server";

export async function LandingHowItWorks() {
  const t = await getTranslations("landing");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  /*
    A ruled sequence, not a card grid. The numbers stay because booking really
    is ordered — you cannot join a lesson you have not booked — but they are set
    as large quiet figures in the margin rather than as coloured labels, so the
    step titles carry the hierarchy.
  */
  return (
    <section className="mt-20">
      <h2 className="text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
        {t("howHeading")}
      </h2>

      <ol className="mt-8 border-t border-border">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-border py-6 sm:grid-cols-[5rem_1fr] sm:gap-x-8 sm:py-8"
          >
            <span
              aria-hidden="true"
              className="font-mono text-2xl font-medium tabular-nums text-[var(--storm-silver)] sm:text-4xl"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
