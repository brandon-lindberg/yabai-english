import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The one button in the system.
 *
 * Alphabet Storm is a value system, not a hue system: primary is solid ink on
 * paper (and inverts to paper on ink at night), so it needs no brand colour and
 * carries 18.9:1 either way. Only `destructive` is allowed a hue.
 *
 * Deliberately no dispersal animation here. The world's dispersal signature is
 * reserved for genuine state changes — a booking confirming, a card learned —
 * so it stays one authored moment instead of firing on every press in a grid
 * a teacher clicks through a hundred times a morning.
 */

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

/**
 * How a button answers the pointer.
 *
 * Two states, and they have to be told apart: hovered, and actually pressed.
 * Primary used to shift only its opacity — ninety per cent of near-black on
 * near-white moves it about twenty values, which is a change you can measure
 * and not one you can see, so the solid buttons read as dead. Secondary and
 * ghost declared the *same* fill for hover and active, so pressing them said
 * nothing at all.
 *
 * Each variant now moves one step further on hover and another on press, along
 * the value ladder rather than into a hue. Written with `color-mix` against the
 * tokens because primary inverts between themes — ink on paper by day, paper on
 * ink at night — so any literal would be right in one theme and wrong in the
 * other. Mixing toward `--app-canvas` lifts the fill toward the page it sits on
 * in both.
 */
const variantClass: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground " +
    "hover:bg-[color-mix(in_srgb,var(--app-primary)_86%,var(--app-canvas))] " +
    "active:bg-[color-mix(in_srgb,var(--app-primary)_74%,var(--app-canvas))] " +
    "disabled:opacity-40",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-[var(--app-hover)] " +
    "active:bg-[color-mix(in_srgb,var(--app-hover)_88%,var(--app-text))] " +
    "disabled:opacity-40",
  ghost:
    "text-foreground hover:bg-[var(--app-hover)] " +
    "active:bg-[color-mix(in_srgb,var(--app-hover)_88%,var(--app-text))] " +
    "disabled:opacity-40",
  destructive:
    "border border-[var(--app-danger)] text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 active:bg-[var(--app-danger)]/15 disabled:opacity-40",
};

/**
 * `md` and `lg` clear the 44px comfortable touch target. `sm` is 36px — above
 * the 24px WCAG 2.5.8 floor — and exists only for genuinely dense surfaces like
 * the availability grid. Do not reach for it to make a page look tidier.
 */
const sizeClass: Record<Size, string> = {
  sm: "min-h-9 gap-1.5 px-3 py-1.5 text-xs",
  md: "min-h-11 gap-2 px-4 py-2 text-sm",
  lg: "min-h-12 gap-2 px-5 py-2.5 text-base",
};

const base =
  "inline-flex select-none items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:cursor-not-allowed";

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return [base, variantClass[variant], sizeClass[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Renders a spinner and blocks input without collapsing the button's width. */
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
