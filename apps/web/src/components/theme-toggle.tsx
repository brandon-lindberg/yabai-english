"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "english-platform-theme";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(readTheme());
    });
  }, []);

  function setMode(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  function toggle() {
    setMode(theme === "dark" ? "light" : "dark");
  }

  if (theme === null) {
    return (
      <span
        className="inline-block h-8 min-w-[4.5rem] rounded-full bg-border"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
      aria-pressed={theme === "dark"}
      title={t("themeToggle")}
    >
      {theme === "dark" ? t("themeDark") : t("themeLight")}
    </button>
  );
}
