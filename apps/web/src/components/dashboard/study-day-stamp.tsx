"use client";

import { useEffect, useRef } from "react";
import styles from "./study-streak.module.css";

let lastPress = "";

export function StudyDayStamp({ claim }: { claim: { account: string; day: string } }) {
  const target = useRef<HTMLSpanElement>(null);
  const { account, day } = claim;

  useEffect(() => {
    const node = target.current;
    if (!node) return;
    const key = "studio-study-stamp:" + account;
    function press() {
      observer?.disconnect();
      const receipt = key + ":" + day;
      if (lastPress === receipt) return;
      lastPress = receipt;
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
  }, [account, day]);

  return <span aria-hidden="true" ref={target} className={styles.stamp} />;
}
