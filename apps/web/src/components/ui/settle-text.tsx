"use client";

import { useMemo } from "react";

/**
 * The world's signature: text condensing out of weather as a state settles.
 *
 * Kana are weather, kanji are stone.
 *
 * Alphabet Storm is built on letters scattering and reforming, which only makes
 * sense for a phonetic script. Hiragana and katakana are phonetic, so they
 * scatter with the Latin. Kanji are whole semantic units — breaking them up
 * would be visual nonsense and would read as the interface glitching — so they
 * land solid from the first frame while the kana settle around them.
 *
 * Use on genuine state changes only. Never on a dense grid, and never on text
 * long enough that the stagger delays reading.
 */

// CJK ideographs (incl. extension A). Everything else here counts as phonetic.
const KANJI = /[㐀-䶿一-鿿豈-﫿]/;

// Any CJK script, kana included. Used only for line-breaking decisions —
// the stone rule above is about kanji specifically.
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

type Props = {
  children: string;
  className?: string;
  /** Per-character stagger. Kept short so a full line still lands fast. */
  staggerMs?: number;
  /** Skip the animation entirely, e.g. when the value did not actually change. */
  animate?: boolean;
};

export function SettleText({
  children,
  className = "",
  staggerMs = 26,
  animate = true,
}: Props) {
  // Split on whitespace but KEEP it, so words stay whole. Animating characters
  // needs inline-block, and inline-block on every character would let the line
  // break between any two of them — which broke "teachers" across two lines.
  // Each word therefore becomes its own nowrap box, and only the spaces between
  // words are legal break points. Japanese has no spaces and legitimately wraps
  // per character, which this leaves intact.
  const words = useMemo(() => children.split(/(\s+)/).filter(Boolean), [children]);

  if (!animate) {
    return <span className={className}>{children}</span>;
  }

  let phoneticIndex = 0;

  // Split text is read character-by-character by some screen readers, so the
  // real string is exposed once and the animated glyphs are hidden outright.
  // (`role="text"` would be the tidy fix but it is Safari-only, not in ARIA.)
  return (
    <span className={className}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((word, w) => {
          if (/^\s+$/.test(word)) return <span key={`sp-${w}`}> </span>;

          const chars = Array.from(word).map((char, i) => {
            const isStone = KANJI.test(char);
            // Only phonetic characters advance the stagger, so kanji never
            // leave a gap in the rhythm of the characters that do move.
            const delay = isStone ? 0 : phoneticIndex++ * staggerMs;

            return (
              <span
                key={`${char}-${i}`}
                className={isStone ? "inline-block" : "storm-settle-char"}
                style={isStone ? undefined : { animationDelay: `${delay}ms` }}
              >
                {char}
              </span>
            );
          });

          // Japanese has no spaces, so the whole line arrives as one "word".
          // Holding it nowrap would push the headline straight off the page —
          // CJK legitimately breaks between characters, so it is left to wrap.
          // Latin words keep their nowrap box so they never break mid-word.
          return CJK.test(word) ? (
            <span key={`w-${w}`}>{chars}</span>
          ) : (
            <span key={`w-${w}`} className="inline-block whitespace-nowrap">
              {chars}
            </span>
          );
        })}
      </span>
    </span>
  );
}
