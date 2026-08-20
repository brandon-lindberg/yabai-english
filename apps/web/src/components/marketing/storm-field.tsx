/**
 * The weather: a field of loose letterforms that the headline condenses out of.
 *
 * Deterministic by seed, so server and client render identically and there is no
 * hydration mismatch. Plain spans with no filters, blurs or animation — the
 * craft-bar reference is a still image, and a drifting particle field would cost
 * battery on the phone where students actually read this.
 *
 * Decorative only: aria-hidden, and it carries no information the copy does not.
 */

// Latin and kana only. Kanji are semantic units and never appear as loose
// weather — see the note in components/ui/settle-text.tsx.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzあいうえおかきくけこさしすせそなにぬねのアイウエオカキクケコサシスセソ";

/** Small deterministic LCG so the field is stable across renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

type Props = {
  /** Change to get a different but still stable arrangement. */
  seed?: number;
  count?: number;
  className?: string;
};

export function StormField({ seed = 20260805, count = 90, className = "" }: Props) {
  const next = rng(seed);

  const glyphs = Array.from({ length: count }, () => {
    const x = next() * 100;
    const y = next() * 100;
    const g = GLYPHS[Math.floor(next() * GLYPHS.length)];
    const size = 0.55 + next() * 1.7;
    const rot = (next() - 0.5) * 70;
    // Density falls off toward the bottom-left, so the field reads as weather
    // gathering at the top-right and thinning into the page.
    const falloff = (x / 100) * 0.6 + (1 - y / 100) * 0.4;
    // Kept low deliberately: the headline sits on top of this and must stay the
    // most legible thing on the page. The field is weather, not content.
    const opacity = 0.05 + falloff * 0.3;
    return { x, y, g, size, rot, opacity };
  });

  return (
    <div
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 overflow-hidden select-none", className]
        .filter(Boolean)
        .join(" ")}
    >
      {glyphs.map((it, i) => (
        <span
          key={i}
          className="absolute font-semibold text-[var(--storm-rain)]"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            fontSize: `${it.size}rem`,
            opacity: it.opacity,
            transform: `rotate(${it.rot}deg)`,
          }}
        >
          {it.g}
        </span>
      ))}
    </div>
  );
}
