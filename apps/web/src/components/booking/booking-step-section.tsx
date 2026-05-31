type Props = {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export function BookingStepSection({
  step,
  title,
  description,
  children,
  disabled = false,
}: Props) {
  return (
    <section
      className={`space-y-3 rounded-xl border border-border bg-background p-4 ${
        disabled ? "opacity-60" : ""
      }`}
      aria-disabled={disabled || undefined}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step {step}</p>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
