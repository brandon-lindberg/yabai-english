import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string | null;
  actions?: ReactNode;
};

/**
 * The page title, at display scale.
 *
 * Every screen in the app gets its name from here, so this is where the world's
 * typography either shows up or doesn't. It was `text-2xl font-semibold`, which
 * is barely louder than a section heading; a page title should be the first
 * thing the eye lands on and unmistakably the largest thing above the fold.
 */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-black leading-[1.05] tracking-[-0.035em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:pb-2">{actions}</div> : null}
    </header>
  );
}
