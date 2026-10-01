"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";

type Props = {
  /** Absolute URL to share. */
  value: string;
  /** Names the field for screen readers; the visible label is the caller's. */
  label: string;
  className?: string;
};

/**
 * A link to hand to someone else: shown in full so it can be read or selected
 * by hand, with a button that copies it.
 *
 * If the clipboard is refused (an insecure origin, a denied permission) the
 * text is selected instead, so the next ⌘C/Ctrl+C still gets it.
 */
export function CopyLinkField({ value, label, className = "" }: Props) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      inputRef.current?.select();
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className={controlClass("min-w-0 flex-1 basis-64 text-sm")}
      />
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? t("copied") : t("copyLink")}
      </Button>
      <span role="status" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
