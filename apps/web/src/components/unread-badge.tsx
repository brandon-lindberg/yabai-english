type Props = {
  count: number;
  /** Optional accessible label builder, e.g. (n) => `${n} unread messages`. */
  label?: (displayedCount: number) => string;
  className?: string;
};

/**
 * iMessage-style unread indicator: solid red pill with white count.
 * Hidden entirely when there's nothing unread. Caps large counts at "99+".
 */
export function UnreadBadge({ count, label, className }: Props) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  const base =
    "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-white ring-2 ring-surface";
  return (
    <span
      data-testid="unread-badge"
      aria-label={label ? label(count) : undefined}
      className={className ? `${base} ${className}` : base}
    >
      {display}
    </span>
  );
}
