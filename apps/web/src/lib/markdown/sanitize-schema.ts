import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

/**
 * What we let through when rendering user-authored markdown.
 *
 * `rehypeRaw` runs first so MDXEditor's inline HTML survives parsing — it has
 * no markdown syntax for underline and emits a raw `<u>`. That means the
 * sanitize step is load-bearing, not decorative: it is the only thing between
 * a pasted `<script>` and the page. Start from the GitHub default allowlist and
 * add `u` alone.
 */
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};
