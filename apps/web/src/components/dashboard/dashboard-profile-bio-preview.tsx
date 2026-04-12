"use client";

import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useState } from "react";

/** MDXEditor can emit inline HTML (e.g. `<u>` for underline); parse it then sanitize like GitHub + `u`. */
const studentBioSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

type Props = {
  markdown: string;
  emptyLabel: string;
};

export function DashboardProfileBioPreview({ markdown, emptyLabel }: Props) {
  const t = useTranslations("dashboard.highlights");
  const regionId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncates, setTruncates] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !markdown.trim()) {
      queueMicrotask(() => setTruncates(false));
      return;
    }

    const measure = () => {
      if (!bodyRef.current || !markdown.trim()) {
        setTruncates(false);
        return;
      }
      if (expanded) {
        setTruncates(true);
        return;
      }
      setTruncates(bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 1);
    };

    queueMicrotask(measure);
    const ro = new ResizeObserver(() => queueMicrotask(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [markdown, expanded]);

  if (!markdown.trim()) {
    return <p className="mt-2 text-sm text-muted">{emptyLabel}</p>;
  }

  const showToggle = expanded || truncates;
  const bodyId = `${regionId}-bio`;

  return (
    <div className="mt-2 space-y-2">
      <div
        id={bodyId}
        ref={bodyRef}
        className={`break-words text-sm text-muted [&_a]:text-link [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-0.5 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc ${expanded ? "" : "line-clamp-4"}`}
      >
        <Markdown rehypePlugins={[rehypeRaw, [rehypeSanitize, studentBioSanitizeSchema]]}>
          {markdown}
        </Markdown>
      </div>
      {showToggle ? (
        <button
          type="button"
          className="text-sm font-medium text-link hover:underline"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("profileBioSeeLess") : t("profileBioSeeMore")}
        </button>
      ) : null}
    </div>
  );
}
