import type { ReactNode } from "react";

/** Remove any HTML/XML-like tag (bank / LLM content must not render raw markup). */
export function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

const OPEN_U = /<\s*u\b[^>]*>/i;
const CLOSE_U = /<\s*\/\s*u\s*>/i;

/**
 * Turn placement stem/option text into safe React: `<u>word</u>` → underlined span; any other tags stripped.
 */
export function placementTextToReact(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const openMatch = OPEN_U.exec(remaining);
    if (!openMatch || openMatch.index === undefined) {
      const tail = stripHtmlTags(remaining);
      if (tail) nodes.push(tail);
      break;
    }
    const before = remaining.slice(0, openMatch.index);
    if (before) {
      const cleaned = stripHtmlTags(before);
      if (cleaned) nodes.push(cleaned);
    }
    remaining = remaining.slice(openMatch.index + openMatch[0].length);
    OPEN_U.lastIndex = 0;

    const closeMatch = CLOSE_U.exec(remaining);
    if (!closeMatch || closeMatch.index === undefined) {
      const rest = stripHtmlTags(remaining);
      if (rest) nodes.push(rest);
      break;
    }
    const inner = stripHtmlTags(remaining.slice(0, closeMatch.index));
    if (inner) {
      nodes.push(
        <span key={`u-${key++}`} className="underline underline-offset-2">
          {inner}
        </span>,
      );
    }
    remaining = remaining.slice(closeMatch.index + closeMatch[0].length);
    CLOSE_U.lastIndex = 0;
  }

  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}
