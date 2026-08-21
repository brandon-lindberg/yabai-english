import { realmPlugin, rootEditor$ } from "@mdxeditor/editor";
import { $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot, $isParagraphNode } from "lexical";

/**
 * Makes a parsed quote look like a toolbar-made one, so it can be undone.
 *
 * MDXEditor reads the current block type from the *top-level* element, so a
 * quote correctly shows as "Quote" in the toolbar. It converts, though, with
 * Lexical's `$setBlocksType`, which acts on the nearest *block*. The two agree
 * for a quote the toolbar built — `blockquote > text` — but markdown parsing
 * nests a paragraph inside (`blockquote > p > text`), and there the nearest
 * block is that inner paragraph. Choosing "Paragraph" then swaps one paragraph
 * for another and leaves the quote wrapper in place, so the quote cannot be
 * removed at all.
 *
 * It only bites content that has been saved and reloaded, which is the worst
 * version of it: quote something, save, and it is permanent.
 *
 * Fixing the shape rather than forking `BlockTypeSelect` keeps one toolbar and
 * one conversion path. Unwrapping is lossless here — `blockquote > p > text`
 * and `blockquote > text` both serialise to `> text`.
 *
 * Deliberately limited to the single-paragraph case. A quote holding several
 * paragraphs (`> a` / `>` / `> b`) genuinely needs them, and flattening would
 * silently join separate paragraphs into one.
 */
export const quoteNormalizationPlugin = realmPlugin({
  init(realm) {
    realm.sub(rootEditor$, (editor) => {
      if (!editor) return;
      editor.registerNodeTransform(QuoteNode, (quote) => {
        const children = quote.getChildren();
        if (children.length !== 1) return;
        const [only] = children;
        if (!$isParagraphNode(only)) return;
        // Lift the paragraph's inline children up into the quote itself.
        const inline = only.getChildren();
        if (inline.length === 0) return;
        for (const child of inline) quote.append(child);
        only.remove();
      });

      /*
        The editor becomes available only after the initial markdown has been
        parsed, so the quotes already on screen are no longer dirty and the
        transform above will never see them — which is precisely the saved-and
        -reloaded content this exists for. Mark them dirty to run the same
        transform over them rather than repeating its logic here.
      */
      editor.update(() => {
        for (const node of $getRoot().getChildren()) {
          if ($isQuoteNode(node)) node.markDirty();
        }
      });
    });
  },
});
