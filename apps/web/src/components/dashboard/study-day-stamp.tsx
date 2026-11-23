"use client";

import { useEffect, useRef } from "react";
import styles from "./study-streak.module.css";

type StampKind = "earned" | "missed";
const lastPress: Record<StampKind, string> = { earned: "", missed: "" };

export function StudyDayStamp({ claim, kind = "earned" }: { claim: { account: string; day: string }; kind?: StampKind }) {
  const target = useRef<HTMLSpanElement>(null);
  const { account, day } = claim;

  useEffect(() => {
    const node = target.current;
    if (!node) return;
    const key = (kind === "missed" ? "studio-study-stamp:missed:" : "studio-study-stamp:") + account;
    function press() {
      observer?.disconnect();
      const receipt = key + ":" + day;
      if (lastPress[kind] === receipt) return;
      lastPress[kind] = receipt;
      try {
        if (localStorage.getItem(key) === day) return;
        localStorage.setItem(key, day);
      } catch { /* In-memory fallback for restricted browsers. */ }
      if (node) node.dataset.pressing = "";
    }

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.intersectionRatio >= 0.5)) press();
    }, { threshold: 0.5 });
    if (!observer) {
      press();
      return;
    }
    observer.observe(node);
    return () => observer?.disconnect();
  }, [account, day, kind]);

  return <span aria-hidden="true" ref={target} className={kind === "missed" ? styles.missed : styles.stamp} />;
}
