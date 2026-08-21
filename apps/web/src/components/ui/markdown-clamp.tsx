"use client";

import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { MarkdownView } from "@/components/ui/markdown-view";
import { actionLinkClass } from "@/components/ui/inline-link";

/**
 * `MarkdownView` plus a see-more toggle, for places where authored text sits
 * inside a list or a card and must not push the layout around.
 *
 * The toggle only appears when the content actually overflows, which can only
 * be known after layout — hence the measure-on-resize below.
 */

type Props = {
  markdown: string;
  emptyLabel: string;
  className?: string;
};

export function MarkdownClamp({ markdown, emptyLabel, className = "" }: Props) {
  const t = useTranslations("common");
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
    // Degrade to a one-shot measure rather than taking the page down over a
    // see-more affordance. Also keeps this renderable without a browser global.
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => queueMicrotask(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [markdown, expanded]);

  if (!markdown.trim()) {
    return emptyLabel ? <p className="mt-2 text-sm text-muted">{emptyLabel}</p> : null;
  }

  const showToggle = expanded || truncates;
  const bodyId = `${regionId}-body`;

  return (
    <div className={["mt-2 space-y-2", className].filter(Boolean).join(" ")}>
      <div id={bodyId} ref={bodyRef} className={expanded ? "" : "line-clamp-4"}>
        <MarkdownView markdown={markdown} className="text-sm text-muted" />
      </div>
      {showToggle ? (
        <button
          type="button"
          className={`${actionLinkClass} text-sm`}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("markdownSeeLess") : t("markdownSeeMore")}
        </button>
      ) : null}
    </div>
  );
}
