"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function QuickReviewFlipCard({ front, back, name, compact = false, disabled = false, onLearned, onNotYet }: {
  front: ReactNode;
  back: ReactNode;
  name?: string;
  compact?: boolean;
  disabled?: boolean;
  onLearned?: () => void;
  onNotYet?: () => void;
}) {
  const t = useTranslations("dashboard.quickReview");
  const [flipped, setFlipped] = useState(false);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const transferFocus = useRef(false);
  const canScore = !!onLearned && !!onNotYet;
  const hintSize = canScore ? "text-[0.65rem]" : "text-xs";
  // Both preview faces contribute to the card's size while sharing one grid cell.
  const facePosition = compact ? "col-start-1 row-start-1" : "absolute inset-0";

  function flip(toBack: boolean) {
    const from = toBack ? frontButton.current : backButton.current;
    transferFocus.current = !!from && from === document.activeElement;
    setFlipped(toBack);
  }

  useEffect(() => {
    if (!transferFocus.current) return;
    transferFocus.current = false;
    (flipped ? backButton : frontButton).current?.focus({ preventScroll: true });
  }, [flipped]);

  return (
    <div className={`mx-auto w-full rounded-2xl perspective-[960px] focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 ${compact ? "grid h-full max-w-72 sm:max-w-none" : "max-w-[11rem]"}`}>
      <div className={`relative w-full transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${compact ? "grid min-h-30 sm:min-h-40" : "aspect-[3/5] min-h-[12rem]"} ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
        <button ref={frontButton} type="button" aria-pressed={flipped}
          aria-label={name ? `${name} · ${t("tapToFlip")}` : t("tapToFlip")}
          disabled={disabled} inert={flipped} onClick={() => flip(true)}
          className={`flex min-w-0 flex-col items-stretch rounded-2xl border-2 border-border bg-background px-2 py-3 text-center [backface-visibility:hidden] disabled:opacity-50 ${facePosition}`}>
          <span className="flex min-h-0 flex-1 items-center justify-center px-1">{front}</span>
          <span className={`shrink-0 pt-1 text-center text-muted ${hintSize}`}>{t("tapToFlip")}</span>
        </button>
        <div inert={!flipped} onClick={disabled ? undefined : () => flip(false)}
          className={`flex min-w-0 cursor-pointer flex-col rounded-2xl border-2 border-border bg-muted/25 p-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${facePosition}`}>
          <button ref={backButton} type="button" disabled={disabled}
            aria-label={name ? `${name} · ${t("tapToFlipBack")}` : undefined}
            onClick={event => { event.stopPropagation(); flip(false); }}
            className={`mx-auto shrink-0 rounded px-2 py-1 text-muted hover:text-foreground disabled:cursor-not-allowed ${hintSize} ${canScore ? "" : "min-h-6"}`}>
            {t("tapToFlipBack")}
          </button>
          <div className={compact ? "my-auto px-1 py-2" : "flex min-h-0 flex-1 items-center justify-center px-1 py-1"}>{back}</div>
          {canScore ? <div className="flex shrink-0 flex-col gap-1 pb-1 pt-0.5" onClick={event => event.stopPropagation()}>
            <Button size="sm" fullWidth disabled={disabled} onClick={() => { setFlipped(false); onLearned(); }}>{t("learned")}</Button>
            <Button variant="secondary" size="sm" fullWidth disabled={disabled} onClick={() => { setFlipped(false); onNotYet(); }}>{t("notYet")}</Button>
          </div> : null}
        </div>
      </div>
    </div>
  );
}
