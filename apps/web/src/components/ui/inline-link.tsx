/**
 * A link that sits inside a sentence.
 *
 * Alphabet Storm is a value system, not a hue system, so `--app-link` is the
 * same ink as `--app-foreground`. That works for a link surrounded by muted
 * body copy — 3.69:1 against it, above the 3:1 that WCAG technique G183 asks
 * for, with the global focus ring and a hover underline doing the rest. It does
 * not work for a link *inside* a foreground-coloured sentence, where there is
 * no difference at all until the pointer happens to land on it.
 *
 * Which is where every consent line in the app lived: "I agree to the Terms of
 * Service" read as flat prose, with nothing to say the terms were reachable.
 * WCAG 1.4.1, on the surfaces where finding the document matters most.
 *
 * So this underlines always. Three components had each declared their own
 * `legalLinkClassName`, character-identical and all missing it.
 *
 * For a standalone action link on its own line — "Open", "Skip for now" —
 * `text-link hover:underline` is still right: it has muted copy around it to
 * contrast against, and a permanent underline there is noise.
 */
export const inlineLinkClass = "font-medium text-link underline underline-offset-4";
