/**
 * A person, at a glance.
 *
 * Nine surfaces render "their photo, or their initials in a circle" — the two
 * member lists, the teacher card and profile, the student detail page, chat,
 * both profile forms and the lesson detail. Each had built it again, with its
 * own size, its own fallback and its own decision about `alt`.
 *
 * The fallback is `aria-hidden` and the image `alt` is empty on purpose: the
 * name is always rendered next to this, so announcing it twice is noise. When
 * that is not true, pass `alt`.
 */

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-base",
} as const;

export function Avatar({
  src,
  name,
  size = "sm",
  alt = "",
  className = "",
}: {
  src?: string | null;
  /** Used for the initials fallback. */
  name?: string | null;
  size?: keyof typeof sizeClass;
  alt?: string;
  className?: string;
}) {
  const initials = (name ?? "").trim().slice(0, 2).toUpperCase() || "—";

  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border font-semibold text-muted",
        sizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
