/**
 * The two ways a link is marked in this world.
 *
 * Alphabet Storm is a value system, not a hue system, so `--app-link` is the
 * same ink as `--app-foreground` — verified in the browser rather than read off
 * the token file: a link and its parent both compute to `rgb(10, 10, 10)`.
 * Nothing about a link is carried by colour, because there is no colour to
 * carry it. So the mark has to come from somewhere else, and which one depends
 * entirely on what the link is sitting in.
 *
 * **`inlineLinkClass` — a link inside a sentence.** Always underlined. There is
 * no value difference to lean on when the surrounding prose is foreground ink,
 * so without a rule under it the link is invisible: identical weight, identical
 * colour, indistinguishable until a pointer happens to land on it. That is WCAG
 * 1.4.1, and it applied to every consent row, the onboarding resume banner, the
 * teacher's calendar hint, and every link in the Terms and Privacy documents.
 *
 * **`actionLinkClass` — a link standing on its own.** Underlined on hover and
 * on focus, not at rest. This one has muted body copy around it to contrast
 * against — 3.69:1 against `--app-muted`, above the 3:1 that WCAG technique
 * G183 asks for — and G183's other half is a non-colour cue on hover *and*
 * focus. Eighteen of these had neither: no underline at any state, or an
 * `opacity` change, which is not a second channel but the same one again.
 *
 * The distinction is not stylistic. It is the difference between a link that
 * has something to contrast against and one that does not.
 */

export const inlineLinkClass = "font-medium text-link underline underline-offset-4";

export const actionLinkClass =
  "font-medium text-link underline-offset-4 hover:underline focus-visible:underline";
