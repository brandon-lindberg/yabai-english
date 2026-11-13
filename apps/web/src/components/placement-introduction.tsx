import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  scope: string;
  instructionsTitle: string;
  duration: string;
  timerNotice: string;
  questionNotice: string;
  actions: ReactNode;
};

export function PlacementIntroduction({ title, description, scope, instructionsTitle, duration, timerNotice, questionNotice, actions }: Props) {
  return <div className="grid border-y border-border sm:grid-cols-2">
    <div className="py-5 sm:py-7 sm:pr-8">
      <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{scope}</p>
    </div>
    <section aria-label={instructionsTitle} className="border-t border-border py-4 sm:border-l sm:border-t-0 sm:py-7 sm:pl-7">
      <h3 className="text-base font-semibold text-foreground">{instructionsTitle}</h3>
      <p className="mt-2 text-sm font-semibold text-foreground">{duration}</p>
      <ul className="mt-1.5 list-disc space-y-1.5 ps-4 text-sm leading-relaxed text-muted">
        <li>{timerNotice}</li>
        <li>{questionNotice}</li>
      </ul>
      <div className="mt-4">{actions}</div>
    </section>
  </div>;
}
