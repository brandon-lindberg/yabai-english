import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { markdownSanitizeSchema } from "@/lib/markdown/sanitize-schema";

/**
 * User-authored markdown, rendered.
 *
 * Deliberately hook-free so server components can render it — the public
 * teacher page and the student profile panel are RSCs, and both used to print
 * markdown source as plain text because the only renderer in the app was a
 * client component welded to a see-more toggle. For that toggle, see
 * `MarkdownClamp`, which wraps this.
 *
 * Tailwind preflight strips list markers, so the classes below put them back.
 * They live here rather than in `globals.css` because they style rendered
 * output, not the editor's contenteditable.
 */

/** Shared with `MarkdownClamp` so both render identically. */
export const markdownProseClass =
  "break-words [&_a]:text-link [&_a]:underline [&_blockquote]:border-l-2 " +
  "[&_blockquote]:border-border [&_blockquote]:pl-3 [&_h2]:font-semibold " +
  "[&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-0.5 " +
  "[&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc";

type Props = {
  markdown: string;
  /** Rendered in place of the content when there is nothing to show. */
  emptyLabel?: string;
  className?: string;
};

export function MarkdownView({ markdown, emptyLabel, className = "" }: Props) {
  if (!markdown.trim()) {
    return emptyLabel ? <p className="text-sm text-muted">{emptyLabel}</p> : null;
  }

  return (
    <div className={[markdownProseClass, className].filter(Boolean).join(" ")}>
      <Markdown rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}>
        {markdown}
      </Markdown>
    </div>
  );
}
